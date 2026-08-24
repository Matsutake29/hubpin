-- 未認証は読むだけ
grant select on public.feed_sources to anon;
grant select on public.feed_entries to anon;
-- 🚨 fetch_logs は anon に grant しない

-- ログイン済み
grant select, insert, update, delete on public.feed_sources to authenticated;
grant select on public.feed_entries to authenticated;
grant select on public.fetch_logs   to authenticated;

-- 🚨 feed_entries / fetch_logs に insert を grant しない。
--    書き込むのは Cron（service role）だけで、service role は GRANT も RLS も通らない。
--    ⭐ ここで grant すると、ポリシーが無いぶん「誰でも書ける」ではなく
--       「誰も書けない」になるが、権限表に嘘が残る。表に出さないほうが正しい。