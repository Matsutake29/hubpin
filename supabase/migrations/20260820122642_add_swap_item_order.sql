-- 並び替えの2行を1トランザクションで入れ替える。
--
-- 🚨 これまでは actions.ts が update を2回に分けて撃っていた。1回目だけ成功すると
--    2行が同じ sort_order を持つが、この列に UNIQUE が無いので DB は何も言わない。
--    2回目が失敗しても console.error が出るだけで、1回目は戻らなかった。
--    ⭐「壊れる」ことはコメントに書いてあったが、「壊れたと分かる」仕組みが無かった。

-- 🚨 security definer にしない（既定の invoker のまま）。
--    invoker なら関数の中でも RLS が効くので、他人の行はそもそも見えない。
--    definer にすると RLS を迂回するため、関数の中で user_id を自分で絞る責任が生まれる。
--    現在の moveItem は「他人の行は RLS で items に入ってこない」に寄りかかって成立している
--    （actions.ts のコメント）。definer にするとその前提が消える。
--
-- 📌 search_path は空にして、スキーマを毎回明示する。関数内での名前解決を固定するため。
create or replace function public.swap_item_order(a_id uuid, b_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  a_order int;
  b_order int;
begin
  select sort_order into a_order from public.items where id = a_id;
  select sort_order into b_order from public.items where id = b_id;

  -- 🚨 RLS で見えない行は「エラー」ではなく NULL で返る。ここで止めないと
  --    片方だけ update が走る。⭐「存在しない id」と「他人のカード」は
  --    どちらもこの経路に来るので、1本で両方をはじける。
  if a_order is null or b_order is null then
    raise exception 'swap_item_order: item not found or not visible to caller';
  end if;

  -- ⭐ 関数は1つのトランザクションなので、2本目が落ちれば1本目も戻る。
  --    これが今回の本体。
  update public.items set sort_order = b_order where id = a_id;
  update public.items set sort_order = a_order where id = b_id;
end;
$$;

-- ⚠️ returns void にしている。戻り値を作ると呼び出し側で握りつぶす経路が増えるので、
--    失敗は例外で返して actions.ts 側で error として受ける。
