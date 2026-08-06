create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('link', 'note', 'feed')),
  title text not null,
  description text,
  url text,
  thumbnail_url text,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_user_id_sort_order_idx on public.items (user_id, sort_order);