-- RLS動作確認（手動実行用）
-- 使い方: Supabase の SQL Editor に1ブロックずつ貼って実行する
-- 🚨 すべて rollback で終わるので、データは変わらない
--
-- ⚠️  SQL Editor は既定で postgres ロール（RLSをバイパスする）ため、
--    ロールを切り替えないと検証にならない
--
-- 🚨 ①〜⑤の期待値は「検証したときのデータ件数」で書いてある。データが増えると嘘になる。
--    2026-08-10 に実際それで見落とした（工程4の時点では items が matsutake の分しか無く、
--    他人の行が見えていても件数が変わらなかった → ⑥ を追加）。
--    ⭐ 新しい検証は「件数」ではなく「不変量」で書くこと。

-- ① 未認証（anon）は公開カードを読める
begin;
  set local role anon;
  select count(*) from public.items;   -- 期待: 8 🚨 2026-08-06 時点の値。08-10 現在は 11
rollback;

-- ② 未認証は書けない
begin;
  set local role anon;
  insert into public.items (user_id, type, title, sort_order)
    values ('a12690b6-fc45-4514-978b-8b06315a6604', 'link', 'ハック', 99);
  -- 期待: ERROR 42501 permission denied for table items
  --      （anon に insert 権限を与えていないので、RLS に到達する前に弾かれる）
rollback;

-- ③ guest は matsutake のカードを書き換えられない
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';
  update public.items set title = 'のっとり'
    where user_id = 'a12690b6-fc45-4514-978b-8b06315a6604'
    returning id, title;   -- 期待: 0行（エラーではない）
rollback;

-- ④ 本人なら書き換えられる（③との対照実験）
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"a12690b6-fc45-4514-978b-8b06315a6604"}';
  update public.items set title = title
    where user_id = 'a12690b6-fc45-4514-978b-8b06315a6604'
    returning id, title;   -- 期待: 7行
rollback;

-- ⑤ visible = false は未認証から見えないが、本人には見える
--    🚨 期待値は 2026-08-06 時点（items 8行・すべて matsutake）。
--       08-10 に guest の4行が増え、さらに select ポリシーを anon 限定に直したので、
--       いま実行すると anon 10 / 本人 7 になる
begin;
  update public.items set visible = false where title = 'Zenn';

  set local role anon;
  select count(*) from public.items;   -- 期待: 7

  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"a12690b6-fc45-4514-978b-8b06315a6604"}';
  select count(*) from public.items;   -- 期待: 8
rollback;

-- ⑥ 🚨 ログイン中に他人のカードが見えない
--    2026-08-10 工程7 手順2 で、ここが 4 になっていた（guest のカードが見えていた）。
--    PERMISSIVE ポリシーは OR で結合されるので、
--    「公開カードは誰でも」を anon 限定にしないと (visible = true) のほうが勝ってしまう。
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"a12690b6-fc45-4514-978b-8b06315a6604"}';

  -- 🚨 期待値を「件数」で書かない。データが増えると陳腐化する（それが今回の見落とし）
  select count(*) filter (where user_id <> 'a12690b6-fc45-4514-978b-8b06315a6604')
    as 他人の行数
  from public.items;   -- 期待: 0
rollback;