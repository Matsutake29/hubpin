-- RLS動作確認（手動実行用）
-- 使い方: Supabase の SQL Editor に1ブロックずつ貼って実行する
-- 🚨 すべて rollback で終わるので、データは変わらない
--
-- ⚠️  SQL Editor は既定で postgres ロール（RLSをバイパスする）ため、
--    ロールを切り替えないと検証にならない

-- ① 未認証（anon）は公開カードを読める
begin;
  set local role anon;
  select count(*) from public.items;   -- 期待: 8
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
begin;
  update public.items set visible = false where title = 'Zenn';

  set local role anon;
  select count(*) from public.items;   -- 期待: 7

  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"a12690b6-fc45-4514-978b-8b06315a6604"}';
  select count(*) from public.items;   -- 期待: 8
rollback;