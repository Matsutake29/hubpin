alter table public.profiles enable row level security;
alter table public.items    enable row level security;

-- 公開ページ用（未認証でも読める）
create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "visible items are viewable by everyone"
  on public.items for select using (visible = true);

-- 本人だけ
create policy "users can view own items"
  on public.items for select using (auth.uid() = user_id);

create policy "users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "users can insert own items"
  on public.items for insert with check (auth.uid() = user_id);

create policy "users can update own items"
  on public.items for update using (auth.uid() = user_id);

create policy "users can delete own items"
  on public.items for delete using (auth.uid() = user_id);

-- updated_at はアプリ側で入れると必ず書き漏れるので、DB側で強制する
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- before update: 保存される「前」に書き換える（after では変更が反映されない）
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger items_set_updated_at before update on public.items
  for each row execute function public.set_updated_at();