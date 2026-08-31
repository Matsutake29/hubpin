-- 未認証は読むだけ
grant select on public.feed_sources to anon;
grant select on public.feed_entries to anon;
-- 🚨 fetch_logs は anon に grant しない

-- ログイン済み
grant select, insert, update, delete on public.feed_sources to authenticated;
grant select on public.feed_entries to authenticated;
grant select on public.fetch_logs   to authenticated;

-- 🚨 feed_entries / fetch_logs に insert を grant しない。書き込むのは Cron（service role）だけ。
--    ⭐ ここで grant すると、ポリシーが無いぶん「誰でも書ける」ではなく
--       「誰も書けない」になるが、権限表に嘘が残る。表に出さないほうが正しい。
--
-- 🚨 2026-08-31 訂正: ここに「service role は GRANT も RLS も通らない」と書いていたが誤り。
--    RLS はバイパスするが GRANT は効く。実測したら service_role には読み書きが1つも無かった。
--    → 20260831015308 で明示的に grant 済み。経緯は開発ログ 2026-08-31。