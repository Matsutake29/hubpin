-- #46 の残り（9・10）
--
-- 9. feed_sources の user_id に索引が無かった。ほかのテーブルは網羅できている
--    （items_user_id_sort_order_idx / feed_entries_source_published_idx / fetch_logs_source_run_idx）。
--    ⚠️ 行が1桁の今は効果は測れない。観点の抜けを埋めておくだけ。
--    📌 enabled は true がほぼ全部なので、索引を付けても選ばれない。user_id だけにした。
--
-- 10. 既存のマイグレーションは if [not] exists を書いていない。適用済みなので書き換えない（触るほうが危ない）。
--     ⭐ 新しく書くぶんから、SQL Editor に貼り直しても途中で落ちない形にする。これがその1本目。
create index if not exists feed_sources_user_id_idx on public.feed_sources (user_id);
