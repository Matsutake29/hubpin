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
--
-- 🚨 ただし「不変量で書けば安全」ではない。⭐ 対象が0件のときは、中身を見ずに真になる。
--    2026-08-25 に工程12 の (13)(14) がこれで、テーブルを作った直後（feed_entries が空）に
--    実行すると、ポリシーが1行も無くても合格した。
--    ⭐ 08-10 は「データが増えると嘘になる」、こちらは「データが無いと嘘になる」。
--    → 検証は「その検証が落ちうるデータがあるか」を先に確かめてから実行すること。

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
-- ============================================================
-- 工程11.2（2026-08-20）で追加。⑨⑩ = profiles のロール指定 ／ ⑪⑫ = 並び替えの RPC
-- ⭐ 期待値は「件数」で書かない（このファイルの冒頭の教訓）。すべて不変量で書く。
-- ============================================================

-- ⑨ profiles は anon から読める
--    🚨 ここが壊れると公開ページが落ちる（死守ライン1）。/[username] は
--       generateStaticParams と本体の2箇所で、cookie 無し＝anon で profiles を引く
begin;
  set local role anon;
  select count(*) > 0 as "profilesが読める" from public.profiles;
  -- 期待: t
  -- 🚨 壊れたら: f（to anon が抜けている）
rollback;

-- ⑩ ログイン中も読める（⑨の対照実験）
--    to anon だけにしていないことの確認。ここが f になると dashboard/layout.tsx の
--    ヘッダー（@username）が消える
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';
  select count(*) > 0 as "profilesが読める" from public.profiles;
  -- 期待: t
  -- 🚨 壊れたら: f（authenticated が抜けている）
rollback;

-- ⑪ 🚨 見えない／存在しない id を渡すと止まる（「わざと壊す」の3回目）
--    ⭐ 「他人のカード」も RLS で見えないので select が NULL を返す。
--       存在しない uuid と同じ経路なので、この1本で両方をはじけていることになる
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';

  select public.swap_item_order(
    (select id from public.items order by sort_order limit 1),
    '00000000-0000-0000-0000-000000000000'
  );
  -- 期待: ERROR  swap_item_order: item not found or not visible to caller
  -- 🚨 壊れたら: 正常終了（＝1本目だけ動いた可能性がある）
rollback;

-- ⑫ 隣同士を入れ替えても sort_order が重複しない（⑪の対照実験）
--    ⭐⭐ この工程の本体をそのまま測っている。「片方だけ動いて2行が同じ sort_order を
--         持つ」がまさに検出したいもので、カードが何枚あっても成立する
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';

  select public.swap_item_order(
    (select id from public.items order by sort_order limit 1),
    (select id from public.items order by sort_order offset 1 limit 1)
  );

  select count(*) = count(distinct sort_order) as "重複が無い" from public.items;
  -- 期待: t
  -- 🚨 壊れたら: f（片方だけ動いて2行が同じ sort_order を持った）
rollback;

-- (13) 🚨 未認証は「公開カードのエントリー」だけ読める
--      ⭐ 件数で書かない。visible = false のカードのエントリーが混ざっていないことを
--         不変量で見る（rls_checks.sql 冒頭のルール）
--      ⚠️ 🆕 2026-08-25: feed_entries が空のあいだは t が返るが、それは検証になっていない。
--         0件を数えているので、ポリシーを1行も書いていなくても合格する（空虚に真）。
--         ⭐ 08-10 の教訓は「件数で書くとデータが増えたとき嘘になる」だったが、
--            不変量で書いても「対象が0件のとき中身を見ずに合格する」ほうは残っていた。
--         🚨 手順2 でダミー行を入れた後に実行すること。
begin;
  set local role anon;
  select count(*) = 0 as "非公開カードのエントリーが混ざっていない"
  from public.feed_entries fe
  join public.feed_sources fs on fs.id = fe.source_id
  join public.items i on i.id = fs.item_id
  where i.visible = false;
  -- 期待: t
  -- 🚨 壊れたら: f（2段辿りのどこかが抜けている）
rollback;

-- (14) 🚨 ログイン中に他人のエントリーが見えない（(6) の feed 版）
--      PERMISSIVE の OR 結合を踏んでいないことの確認
--      ⚠️ 🆕 2026-08-25: (13) と同じ理由で、feed_entries が空のあいだは実行しない。
--         🚨 手順2 でダミー行を入れた後に実行すること。
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';
  select count(*) = 0 as "他人のエントリーが見えない"
  from public.feed_entries fe
  join public.feed_sources fs on fs.id = fe.source_id
  where fs.user_id <> 'b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b';
  -- 期待: t
  -- 🚨 壊れたら: f（anon 用ポリシーに to anon が抜けている）
rollback;

-- (15) 🚨 アプリからは feed_entries に書けない（ポリシーが無いことの確認）
begin;
  set local role authenticated;
  set local "request.jwt.claims" = '{"sub":"b3d7dbd6-1887-4640-8e43-5fa03c3c1e6b"}';
  insert into public.feed_entries (source_id, title, url)
  values ((select id from public.feed_sources limit 1), 'x', 'https://example.com');
  -- 期待: ERROR  permission denied for table feed_entries
  -- 🚨 壊れたら: 成功する（grant insert を書いてしまっている）
rollback;

-- (16) fetch_logs は未認証から一切見えない
begin;
  set local role anon;
  select count(*) from public.fetch_logs;
  -- 期待: ERROR  permission denied for table fetch_logs
  -- 🚨 壊れたら: 0 が返る（grant select を書いてしまっている）
rollback;
