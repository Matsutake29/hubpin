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

-- ⑤-a 未認証からは visible = false が見えない
--    🚨 ⑤ を1本にまとめないこと。SQL Editor は最後の SELECT の結果しか表示しないので、
--       anon 側の結果が画面に出ず、本人側の値だけを見て通ったことになる。
--       2026-08-17 に実際そうなっていた（⑤ の主目的が一度も画面に出ないまま通っていた）。
--    📌 当初の期待値は「anon 7 / 本人 8」（2026-08-06 時点・items 8行）。
--       08-10 に guest の4行が増えて陳腐化したので、件数を直書きしない形に変えた。
begin;
  update public.items set visible = false where title = 'Zenn';

  set local role anon;
  select
    count(*)                               as 見える総数,    -- 🚨 壊れたら: 0（そもそも読めない）
    count(*) filter (where title = 'Zenn') as Zennが見える数 -- 期待: 0 ／ 🚨 壊れたら: 1
  from public.items;
rollback;

-- ⑤-b 本人には visible = false でも見える（⑤-a の対照実験）
begin;
  update public.items set visible = false where title = 'Zenn';

  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"a12690b6-fc45-4514-978b-8b06315a6604"}';
  select
    count(*)                               as 見える総数,
    count(*) filter (where title = 'Zenn') as Zennが見える数 -- 期待: 1 ／ 🚨 壊れたら: 0
  from public.items;
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

-- ⑦ 🚨 guest 本人でも username は変更できない（Issue #24 の本体）
--    2026-08-17 まで、ここが通ってしまっていた。
--    RLS（auth.uid() = id）は「本人の行だから」成立する。GRANT 側で閉じている。
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';
  update public.profiles set username = 'hacked'
    where id = 'b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b';
  -- 期待: ERROR 42501 permission denied for table profiles
  -- 🚨 壊れたら: UPDATE 1（権限が開いている＝直っていない）
rollback;

-- ⑧ 読むほうは今までどおりできる（⑦の対照実験）
--    revoke したのは update だけで、select を巻き込んでいないことの確認
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';
  select id, username from public.profiles
    where id = 'b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b';
  -- 期待: 1行・username = 'guest'
  -- 🚨 壊れたら: 0行（revoke が select まで巻き込んだ）
  --            / 'hacked'（⑦ が rollback されず値が残った）
rollback;