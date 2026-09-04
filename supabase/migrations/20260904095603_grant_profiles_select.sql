-- 🚨 Cron から公開ページを再検証するとき、service client が profiles.username を読む。
--    service_role がバイパスするのは RLS（関所②）だけで、GRANT（関所①）は効く。
--    profiles には service_role への GRANT が1つも無かった（20260806032348）ので足す。
--    ⭐ 2026-09-04 実測: この GRANT が無い状態で叩くと
--       「permission denied for table profiles」が出て、再検証だけが静かにスキップされた
--       （取得は成功し、レスポンスは 200 のままだった）。
-- ⚠️ select だけ。service client が profiles に書く用事は無い。
grant select on public.profiles to service_role;