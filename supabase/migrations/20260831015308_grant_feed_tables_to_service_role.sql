-- 🚨 service_role には読み書きの権限が1つも無かった（2026-08-31 実測）。
--    feed_entries / feed_sources / fetch_logs の3テーブルとも service_role=Dxtm で、
--    Dxtm は TRUNCATE / REFERENCES / TRIGGER / MAINTAIN。
--    a(insert) r(select) w(update) d(delete) は1つも入っていない。
--    ⭐ arwd は「GRANT ファイルに自分で書いたぶん」だけが入っていた。
--
-- ⚠️  20260824205413 のコメント「service role は GRANT も RLS も通らない」は誤り。
--    RLS はバイパスする（ロール属性）が、GRANT は効く。Supabase の既定は読み書きを配らない。
--
-- 📌 replace_feed_entries() は security invoker なので、関数の中の delete / insert / update も
--    呼び出し元（service role）の権限で動く。この GRANT が無いと関数ごと permission denied で落ちる。
grant select, insert, delete on public.feed_entries to service_role;
grant select, update on public.feed_sources to service_role;

-- ⚠️  fetch_logs は工程13（行を入れるのはそちら）。同じ壁に当たるので、そのときに
--    grant insert on public.fetch_logs to service_role; が要る。