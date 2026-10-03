-- Privacy-safe, low-cardinality product funnel plus admin-controlled flags.
-- No page text, searches, notes, answers, IP addresses, or arbitrary metadata
-- are collected. Funnel events are first milestone per user; return usage is
-- deduplicated per user per day.

create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in (
    'signup', 'onboarding_completed', 'roadmap_viewed', 'topic_started',
    'topic_completed', 'project_started', 'project_deployed', 'return_usage'
  )),
  roadmap_id text references public.roadmaps(id) on delete set null,
  topic_id text references public.roadmap_topics(id) on delete set null,
  legacy_topic_id text references public.topics(id) on delete set null,
  project_id text references public.roadmap_projects(id) on delete set null,
  event_day date not null default (now() at time zone 'utc')::date,
  occurred_at timestamptz not null default now()
);
alter table public.product_events add column if not exists legacy_topic_id text references public.topics(id) on delete set null;
create unique index if not exists product_events_one_milestone_idx
  on public.product_events(user_id, event_name) where event_name <> 'return_usage';
create unique index if not exists product_events_one_return_per_day_idx
  on public.product_events(user_id, event_day) where event_name = 'return_usage';
create index if not exists product_events_funnel_idx
  on public.product_events(event_name, occurred_at desc);
alter table public.product_events enable row level security;
create policy "users read own product events" on public.product_events
  for select to authenticated using (auth.uid() = user_id);
grant select on public.product_events to authenticated;
revoke insert, update, delete on public.product_events from anon, authenticated;

drop function if exists public.record_product_event(text,text,text,text);
create or replace function public.record_product_event(
  p_event_name text,
  p_roadmap_id text default null,
  p_topic_id text default null,
  p_project_id text default null,
  p_legacy_topic_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  enrolled boolean;
begin
  if caller_id is null then raise exception 'authentication required'; end if;
  if p_event_name not in ('roadmap_viewed','topic_started','topic_completed','project_started','project_deployed','return_usage') then
    raise exception 'event cannot be recorded by a client';
  end if;

  if p_event_name = 'roadmap_viewed' then
    select exists (select 1 from public.user_roadmaps ur
      join public.roadmap_versions v on v.id = ur.roadmap_version_id
      where ur.user_id = caller_id and ur.roadmap_id = p_roadmap_id
        and ur.status = 'active' and v.status = 'published')
      or exists (select 1 from public.roadmaps r join public.roadmap_versions v on v.roadmap_id = r.id
        where r.id = p_roadmap_id and r.is_public and v.is_current and v.status = 'published') into enrolled;
    if not coalesce(enrolled, false) then raise exception 'published roadmap access required'; end if;
  elsif p_event_name in ('topic_started','topic_completed') then
    if p_topic_id is not null and p_legacy_topic_id is not null then
      raise exception 'provide one topic identifier';
    elsif p_topic_id is null and p_legacy_topic_id is null then
      raise exception 'topic identifier required';
    elsif p_topic_id is not null then
      select exists (select 1 from public.roadmap_topics t
      join public.roadmap_modules m on m.id = t.module_id
      join public.roadmap_phases p on p.id = m.phase_id
      join public.user_roadmaps ur on ur.roadmap_id = p.roadmap_id and ur.roadmap_version_id = p.roadmap_version_id
      join public.roadmap_versions v on v.id = ur.roadmap_version_id
      where t.id = p_topic_id and ur.user_id = caller_id and ur.status = 'active' and v.status = 'published')
      or exists (select 1 from public.roadmap_topics t
        join public.roadmap_modules m on m.id = t.module_id
        join public.roadmap_phases p on p.id = m.phase_id
        join public.roadmaps r on r.id = p.roadmap_id
        join public.roadmap_versions v on v.id = p.roadmap_version_id
        where t.id = p_topic_id and r.is_public and v.is_current and v.status = 'published') into enrolled;
    else
      select exists (select 1 from public.topics t
        join public.phases p on p.id = t.phase_id
        join public.user_roadmaps ur on ur.roadmap_id = p.roadmap_id and ur.roadmap_version_id = p.roadmap_version_id
        join public.roadmap_versions v on v.id = ur.roadmap_version_id
        where t.id = p_legacy_topic_id and ur.user_id = caller_id and ur.status = 'active' and v.status = 'published')
        or exists (select 1 from public.topics t
          join public.phases p on p.id = t.phase_id
          join public.roadmaps r on r.id = p.roadmap_id
          join public.roadmap_versions v on v.id = p.roadmap_version_id
          where t.id = p_legacy_topic_id and r.is_public and v.is_current and v.status = 'published') into enrolled;
    end if;
    if not coalesce(enrolled, false) then raise exception 'topic is outside available published content'; end if;
    if p_event_name = 'topic_started' and p_topic_id is not null and not exists (
      select 1 from public.user_roadmap_topic_progress up
      where up.user_id = caller_id and up.topic_id = p_topic_id and up.status <> 'not_started'
    ) then raise exception 'topic progress must be saved before recording a start'; end if;
    if p_event_name = 'topic_started' and p_legacy_topic_id is not null and not exists (
      select 1 from public.topic_progress up
      where up.user_id = caller_id and up.topic_id = p_legacy_topic_id and up.completed
    ) then raise exception 'topic activity must be saved before recording a start'; end if;
    if p_event_name = 'topic_completed' and p_topic_id is not null and not exists (
      select 1 from public.user_roadmap_topic_progress up
      where up.user_id = caller_id and up.topic_id = p_topic_id and up.status in ('applied','mastered')
    ) then raise exception 'topic must be applied or mastered before recording completion'; end if;
    if p_event_name = 'topic_completed' and p_legacy_topic_id is not null and not exists (
      select 1 from public.topic_progress up
      where up.user_id = caller_id and up.topic_id = p_legacy_topic_id and up.completed
    ) then raise exception 'topic must be completed before recording completion'; end if;
  elsif p_event_name in ('project_started','project_deployed') then
    select exists (select 1 from public.roadmap_projects rp
      join public.roadmap_phases p on p.id = rp.phase_id
      join public.user_roadmaps ur on ur.roadmap_id = p.roadmap_id and ur.roadmap_version_id = p.roadmap_version_id
      join public.roadmap_versions v on v.id = ur.roadmap_version_id
      where rp.id = p_project_id and ur.user_id = caller_id and ur.status = 'active' and v.status = 'published')
      or exists (select 1 from public.roadmap_projects rp
        join public.roadmap_phases p on p.id = rp.phase_id
        join public.roadmaps r on r.id = p.roadmap_id
        join public.roadmap_versions v on v.id = p.roadmap_version_id
        where rp.id = p_project_id and r.is_public and v.is_current and v.status = 'published') into enrolled;
    if not coalesce(enrolled, false) then raise exception 'project is outside available published content'; end if;
    if p_event_name = 'project_started' and not exists (
      select 1 from public.user_roadmap_project_progress pp
      where pp.user_id = caller_id and pp.project_id = p_project_id and pp.status <> 'not_started'
    ) then raise exception 'project progress must be saved before recording a start'; end if;
    if p_event_name = 'project_deployed' and not exists (
      select 1 from public.user_roadmap_project_progress pp
      where pp.user_id = caller_id and pp.project_id = p_project_id
        and coalesce(pp.deployed_url, '') ~ '^https?://'
    ) then raise exception 'a deployed URL must be saved before recording a deployment'; end if;
  end if;

  insert into public.product_events(user_id, event_name, roadmap_id, topic_id, project_id, legacy_topic_id)
  values (caller_id, p_event_name, p_roadmap_id, p_topic_id, p_project_id, p_legacy_topic_id)
  on conflict do nothing;
end;
$$;
revoke all on function public.record_product_event(text,text,text,text,text) from public, anon;
grant execute on function public.record_product_event(text,text,text,text,text) to authenticated;

create or replace function public.track_product_signup()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.product_events(user_id, event_name) values (new.id, 'signup') on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists track_product_signup on auth.users;
create trigger track_product_signup after insert on auth.users
for each row execute function public.track_product_signup();

create or replace function public.track_onboarding_completion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.completed_at is null then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.product_events(user_id, event_name, roadmap_id)
    values (new.user_id, 'onboarding_completed', (
      select ur.roadmap_id from public.user_roadmaps ur
      where ur.user_id = new.user_id and ur.status = 'active' limit 1
    )) on conflict do nothing;
  elsif old.completed_at is null then
    insert into public.product_events(user_id, event_name, roadmap_id)
    values (new.user_id, 'onboarding_completed', (
      select ur.roadmap_id from public.user_roadmaps ur
      where ur.user_id = new.user_id and ur.status = 'active' limit 1
    )) on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists track_onboarding_completion on public.onboarding_responses;
create trigger track_onboarding_completion after insert or update of completed_at
on public.onboarding_responses for each row execute function public.track_onboarding_completion();

create or replace function public.track_legacy_topic_start()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.topic_id is not null then
    insert into public.product_events(user_id, event_name, legacy_topic_id)
    values (new.user_id, 'topic_started', new.topic_id) on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists track_legacy_topic_start on public.study_events;
create trigger track_legacy_topic_start after insert on public.study_events
for each row execute function public.track_legacy_topic_start();

create or replace function public.track_legacy_topic_completion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not new.completed then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.product_events(user_id, event_name, legacy_topic_id)
    values (new.user_id, 'topic_completed', new.topic_id) on conflict do nothing;
  elsif old.completed is distinct from true then
    insert into public.product_events(user_id, event_name, legacy_topic_id)
    values (new.user_id, 'topic_completed', new.topic_id) on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists track_legacy_topic_completion on public.topic_progress;
create trigger track_legacy_topic_completion after insert or update of completed
on public.topic_progress for each row execute function public.track_legacy_topic_completion();

create or replace function public.get_product_funnel()
returns table(event_name text, user_count bigint, first_event_at timestamptz, last_event_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'administrator access required'; end if;
  return query select e.event_name, count(distinct e.user_id), min(e.occurred_at), max(e.occurred_at)
  from public.product_events e
  group by e.event_name
  order by case e.event_name
    when 'signup' then 1 when 'onboarding_completed' then 2 when 'roadmap_viewed' then 3
    when 'topic_started' then 4 when 'topic_completed' then 5 when 'project_started' then 6
    when 'project_deployed' then 7 else 8 end;
end;
$$;
revoke all on function public.get_product_funnel() from public, anon;
grant execute on function public.get_product_funnel() to authenticated;

create or replace function public.set_role_roadmap_assignment(p_role_id text, p_roadmap_id text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'administrator access required'; end if;
  if not exists (select 1 from public.target_roles tr where tr.id = p_role_id) then
    raise exception 'target role not found';
  end if;
  if not exists (select 1 from public.roadmaps r join public.roadmap_versions v on v.roadmap_id = r.id
    where r.id = p_roadmap_id and r.is_public and v.is_current and v.status = 'published') then
    raise exception 'role must map to a public roadmap with a current published version';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_role_id));
  delete from public.role_roadmap_assignments where role_id = p_role_id;
  insert into public.role_roadmap_assignments(role_id, roadmap_id, priority) values (p_role_id, p_roadmap_id, 0);
end;
$$;
revoke all on function public.set_role_roadmap_assignment(text,text) from public, anon;
grant execute on function public.set_role_roadmap_assignment(text,text) to authenticated;

create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled boolean not null default false,
  description text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.feature_flags enable row level security;
create policy "authenticated users read feature flags" on public.feature_flags
  for select to authenticated using (true);
create policy "admins manage feature flags" on public.feature_flags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.feature_flags to authenticated;
grant insert, update, delete on public.feature_flags to authenticated;
insert into public.feature_flags(key, enabled, description) values
  ('github_integration', true, 'Connect GitHub activity and repositories.'),
  ('portfolio_builder', true, 'Build and publish an opt-in public portfolio.'),
  ('social', false, 'Social sharing and community features.'),
  ('new_dashboard', true, 'Use the personalized roadmap dashboard.'),
  ('beta_features', false, 'Opt into unfinished features during a controlled beta.')
on conflict (key) do nothing;

create or replace function public.touch_feature_flag_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); new.updated_by = auth.uid(); return new; end; $$;
drop trigger if exists touch_feature_flag_updated_at on public.feature_flags;
create trigger touch_feature_flag_updated_at before update on public.feature_flags
for each row execute function public.touch_feature_flag_updated_at();

comment on table public.product_events is
  'Minimal first-milestone funnel counts and daily return usage. Stores no user-generated content or arbitrary metadata.';
comment on table public.feature_flags is
  'Admin-managed global product flags; enabled values are readable by signed-in users.';
