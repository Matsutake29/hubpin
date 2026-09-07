-- feed_sources に書く UI は1つも無い（src/ に insert は0本）のに、
-- authenticated に insert/update/delete が開いていた。
-- 🚨 INSERT ポリシーは with check (auth.uid() = user_id) で user_id しか見ておらず、
--    item_id は他人のカードでも通る。公開ページの埋め込みは item_id を辿るだけなので、
--    他人のページに自分のフィードを差し込めた。
-- 🚨 endpoint_url は無検証のまま Cron の fetch() に渡るので SSRF の入口でもあった。
-- 📌 Issue #24（profiles の update が UI 無しで開いていた）と同型の再発。
-- ⭐ 将来 feed_sources の編集 UI を作るときは、ここに列単位で grant を足すこと。
--    そのときは item_id の所有者チェックを FK で置く（ポリシーだと書き忘れが効く）。
revoke insert, update, delete on public.feed_sources from authenticated;