-- Profiles + coaching progress for staff CRM
-- Apply in Supabase SQL Editor (or: supabase db push) against project vxqryagqfqsjcwndifvl

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  full_name text,
  church text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role is null or role in ('pastor', 'disciple')
  )
);

create table if not exists public.coaching_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  started boolean not null default false,
  completed text[] not null default '{}'::text[],
  current_step integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint coaching_progress_current_step_check check (
    current_step >= 1 and current_step <= 7
  )
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists coaching_progress_set_updated_at on public.coaching_progress;
create trigger coaching_progress_set_updated_at
  before update on public.coaching_progress
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.coaching_progress enable row level security;

-- profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- coaching_progress policies
drop policy if exists "coaching_progress_select_own_or_admin" on public.coaching_progress;
create policy "coaching_progress_select_own_or_admin"
  on public.coaching_progress
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "coaching_progress_insert_own" on public.coaching_progress;
create policy "coaching_progress_insert_own"
  on public.coaching_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "coaching_progress_update_own" on public.coaching_progress;
create policy "coaching_progress_update_own"
  on public.coaching_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.coaching_progress to authenticated;
