create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  display_name_en text,
  title text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_format check (username ~ '^[a-z0-9_-]{3,30}$'),
  constraint username_not_reserved check (
    username not in ('about', 'dashboard', 'login', 'api', 'auth', '_next', 'favicon')
  )
);