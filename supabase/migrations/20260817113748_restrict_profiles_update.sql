-- プロフィール編集 UI が1つも無いのに update 権限だけが開いていた（Issue #24）。
-- デモログインは誰でも押せるので、正規のセッションから REST 経由で
-- guest の username を書き換えられ、/guest が恒久的に 404 になりうる。
-- RLS（auth.uid() = id）は「本人の行だから」成立してしまうので、GRANT 側で閉じる。
revoke update on public.profiles from authenticated;

-- 🚨 将来プロフィール編集機能を作るときは、ここに列単位で grant を足すこと。
--    grant update (display_name, title, ...) on public.profiles to authenticated;
--    列を足したのに grant を足し忘れると、RLS は通るのに UPDATE だけ落ちる。
--    エラーは permission denied for column … で出るが、原因を RLS 側に探しに行きやすい。