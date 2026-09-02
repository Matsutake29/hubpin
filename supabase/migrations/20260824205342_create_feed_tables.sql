-- feed_sources: items と1対1。「このカードはどこから取ってくるか」
create table public.feed_sources (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('wordpress', 'zenn', 'github')),
  endpoint_url text not null,
  fallback_url text,
  max_entries int not null default 3 check (max_entries between 1 and 10),
  enabled boolean not null default true,
  last_fetched_at timestamptz,
  last_status text check (last_status in ('success', 'failure')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 🚨 item_id に unique を置く。ER図の「1対1」はこれが無いと守られない。
--    2枚目の feed_sources が同じカードに刺さると、表示側がどちらを出すか決められなくなる。

-- feed_entries: 取得結果。⭐ キャッシュではなく保存（障害設計1）
create table public.feed_entries (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.feed_sources(id) on delete cascade,
  title text not null,
  url text not null,
  published_at timestamptz,
  thumbnail_url text,
  fetched_at timestamptz not null default now()
);

-- ⚠️ user_id を持たせていない（→ 論点A の判断。理由は 1-2 末尾）

create index feed_entries_source_published_idx
  on public.feed_entries (source_id, published_at desc);

-- fetch_logs: Cron の成否記録。🚨 定義だけ。行を入れるのは工程13
create table public.fetch_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.feed_sources(id) on delete cascade,
  run_at timestamptz not null default now(),
  status text not null check (status in ('success', 'failure')),
  entry_count int,
  error_message text
);

create index fetch_logs_source_run_idx on public.fetch_logs (source_id, run_at desc);

create trigger feed_sources_set_updated_at before update on public.feed_sources
  for each row execute function public.set_updated_at();