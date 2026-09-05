-- 🚨 service_role は GRANT（関所①）と RLS（関所②）のうち、RLS だけをバイパスする。
--    GRANT が無ければ permission denied で落ちる（2026-08-31 に feed_entries で実測）。
-- 📌 20260831015308 のコメントが「工程13 でそのときに」と書き残していた1行がこれ。
grant insert on public.fetch_logs to service_role;