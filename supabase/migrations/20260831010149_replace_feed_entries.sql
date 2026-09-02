-- フィードの取得結果を1トランザクションで丸ごと入れ替える。
--
-- 🚨 delete と insert を分けて撃つと、削除だけ成功したときにカードが空になる。
--    関数の中は1つのトランザクションなので、insert が落ちれば delete も戻る。
--    ⭐ 工程11.2 の swap_item_order と同じ手当て（update 2回で片方だけ通る問題）。
--
-- 🚨 security definer にしない（既定の invoker のまま）。工程11.2 の判断を踏襲。
--    呼び出し元の権限で動くので、アプリから呼んでも feed_entries の insert 権限が無くて落ちる。
--
-- 📌 search_path は空にして、スキーマを毎回明示する。関数内での名前解決を固定するため。
create or replace function public.replace_feed_entries(p_source_id uuid, p_entries jsonb)
returns int
language plpgsql
set search_path = ''
as $$
declare
  inserted_count int;
begin
  -- 🚨 存在しない source_id を渡されると、delete も insert も update も 0行で、
  --    エラーが1つも出ないまま何も起きない。ここで止める。
  if not exists (select 1 from public.feed_sources where id = p_source_id) then
    raise exception 'replace_feed_entries: feed_source % not found', p_source_id;
  end if;

  delete from public.feed_entries where source_id = p_source_id;

  insert into public.feed_entries (source_id, title, url, published_at, thumbnail_url)
  select p_source_id, e.title, e.url, e.published_at, e.thumbnail_url
  from jsonb_to_recordset(p_entries)
    as e(title text, url text, published_at timestamptz, thumbnail_url text);

  -- 🚨 row_count は「直前の文」の行数。ここを update の後ろに置くと 1 が返る。
  get diagnostics inserted_count = row_count;

  update public.feed_sources
    set last_fetched_at = now(), last_status = 'success'
    where id = p_source_id;

  return inserted_count;
end;
$$;

-- 🚨 アプリからは呼ばない関数なので、既定の PUBLIC 実行権限を取り消す。
--    中の insert はどのみち GRANT が無くて落ちるが、「呼べるが必ず失敗する」状態を
--    権限表に残さない（手順1 (c) の GRANT ファイルと同じ判断）。
--    📌 swap_item_order を閉じないのは正しい。あちらはアプリが呼ぶ関数。
revoke execute on function public.replace_feed_entries(uuid, jsonb) from public;

-- 🚨 PUBLIC の暗黙の権限を取り消すと service_role も巻き込まれる（proacl が NULL ＝
--    デフォルトのままで、service_role への個別付与は無いことを 08-31 に実測）。
--    書き込むのは Cron（service role）だけなので、ここで明示的に与え直す。
grant execute on function public.replace_feed_entries(uuid, jsonb) to service_role;