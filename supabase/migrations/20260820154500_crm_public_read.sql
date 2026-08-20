-- Allow open CRM page to read member directory without sign-in.
-- Keep inserts/updates restricted to the signed-in owner's own rows.

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_all"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "coaching_progress_select_own_or_admin" on public.coaching_progress;
create policy "coaching_progress_select_all"
  on public.coaching_progress
  for select
  to anon, authenticated
  using (true);

grant select on public.profiles to anon;
grant select on public.coaching_progress to anon;
