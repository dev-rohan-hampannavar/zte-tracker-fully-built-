-- P0 security hardening: public profiles must never grant direct SELECT on
-- private progress tables. Public rendering is performed only by a server
-- route that selects an explicit allow-list.
drop policy if exists "public read: opted-in profile settings" on public.user_settings;
drop policy if exists "public read: opted-in topic progress" on public.topic_progress;
drop policy if exists "public read: opted-in dsa progress" on public.dsa_progress;
drop policy if exists "public read: opted-in project progress" on public.project_progress;
drop policy if exists "public read: opted-in build in public status" on public.build_in_public_status;
drop policy if exists "public read: opted-in streak summary" on public.public_streak_summary;

create or replace function public.ensure_profile_slug()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  candidate text;
  existing text;
begin
  if caller is null then raise exception 'authentication required'; end if;
  select public_profile_slug into existing from public.user_settings where user_id = caller;
  if existing is not null then return existing; end if;
  candidate := substr(md5(random()::text || clock_timestamp()::text || caller::text), 1, 10);
  update public.user_settings set public_profile_slug = candidate where user_id = caller;
  return candidate;
end;
$$;

revoke all on function public.ensure_profile_slug(uuid) from public, anon, authenticated;
revoke all on function public.ensure_profile_slug() from public, anon;
grant execute on function public.ensure_profile_slug() to authenticated;
