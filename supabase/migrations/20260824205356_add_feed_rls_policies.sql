alter table public.feed_sources enable row level security;
alter table public.feed_entries enable row level security;
alter table public.fetch_logs   enable row level security;

-- ── feed_sources ───────────────────────────────────────────
-- 未認証: 公開カードにぶら下がっているものだけ
create policy "feed sources of visible items are viewable by anon"
  on public.feed_sources for select to anon
  using (exists (
    select 1 from public.items i
    where i.id = feed_sources.item_id and i.visible = true
  ));

-- 本人: 自分のものだけ（user_id を直接持っているので1行で書ける）
create policy "users can view own feed sources"
  on public.feed_sources for select to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own feed sources"
  on public.feed_sources for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own feed sources"
  on public.feed_sources for update to authenticated
  using (auth.uid() = user_id);

create policy "users can delete own feed sources"
  on public.feed_sources for delete to authenticated
  using (auth.uid() = user_id);

-- ── feed_entries ───────────────────────────────────────────
-- 🚨 ここが「辿る RLS」の本体。2段辿る（entries → sources → items）
create policy "feed entries of visible items are viewable by anon"
  on public.feed_entries for select to anon
  using (exists (
    select 1 from public.feed_sources fs
    join public.items i on i.id = fs.item_id
    where fs.id = feed_entries.source_id and i.visible = true
  ));

create policy "users can view own feed entries"
  on public.feed_entries for select to authenticated
  using (exists (
    select 1 from public.feed_sources fs
    where fs.id = feed_entries.source_id and fs.user_id = auth.uid()
  ));

-- ⚠️ insert / update / delete のポリシーは書かない（→ 手順R0 の A-3）

-- ── fetch_logs ─────────────────────────────────────────────
-- 🚨 anon には見せない。Cron の実行ログは訪問者に関係が無い
create policy "users can view own fetch logs"
  on public.fetch_logs for select to authenticated
  using (exists (
    select 1 from public.feed_sources fs
    where fs.id = fetch_logs.source_id and fs.user_id = auth.uid()
  ));