-- ONE PASTE: create members CRM tables + backfill from existing Auth users
-- Run in Supabase → SQL Editor → New query → Run

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

-- Keep profiles in sync when someone joins via Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  member_role text := meta ->> 'role';
begin
  if member_role is distinct from 'pastor' and member_role is distinct from 'disciple' then
    member_role := null;
  end if;

  insert into public.profiles (
    id, email, first_name, last_name, full_name, church, role, created_at, updated_at
  ) values (
    new.id,
    new.email,
    nullif(trim(coalesce(meta ->> 'first_name', '')), ''),
    nullif(trim(coalesce(meta ->> 'last_name', '')), ''),
    nullif(trim(coalesce(meta ->> 'full_name', '')), ''),
    nullif(trim(coalesce(meta ->> 'church', '')), ''),
    member_role,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    church = coalesce(excluded.church, public.profiles.church),
    role = coalesce(excluded.role, public.profiles.role),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.coaching_progress enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

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

drop policy if exists "coaching_progress_select_own_or_admin" on public.coaching_progress;
drop policy if exists "coaching_progress_select_all" on public.coaching_progress;
create policy "coaching_progress_select_all"
  on public.coaching_progress
  for select
  to anon, authenticated
  using (true);

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

grant select on public.profiles to anon, authenticated;
grant select on public.coaching_progress to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update on public.coaching_progress to authenticated;

-- Backfill every existing Auth user into profiles (so CRM shows members now)
insert into public.profiles (
  id, email, first_name, last_name, full_name, church, role, created_at, updated_at
)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'last_name', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'church', '')), ''),
  case
    when u.raw_user_meta_data ->> 'role' in ('pastor', 'disciple')
      then u.raw_user_meta_data ->> 'role'
    else null
  end,
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  first_name = coalesce(excluded.first_name, public.profiles.first_name),
  last_name = coalesce(excluded.last_name, public.profiles.last_name),
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  church = coalesce(excluded.church, public.profiles.church),
  role = coalesce(excluded.role, public.profiles.role),
  updated_at = now();
