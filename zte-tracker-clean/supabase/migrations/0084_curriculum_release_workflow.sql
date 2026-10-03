-- Add a controlled content lifecycle and keep edits to a draft separate from
-- versions already used by learners.
alter table public.roadmap_versions
  add column if not exists status text not null default 'published',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz;

alter table public.roadmap_versions
  drop constraint if exists roadmap_versions_status_check;
alter table public.roadmap_versions
  add constraint roadmap_versions_status_check
  check (status in ('draft', 'review', 'test', 'published'));

update public.roadmap_versions
set published_at = coalesce(published_at, released_at)
where status = 'published';

create table if not exists public.roadmap_version_events (
  id uuid primary key default gen_random_uuid(),
  roadmap_version_id uuid not null references public.roadmap_versions(id) on delete cascade,
  from_status text check (from_status is null or from_status in ('draft', 'review', 'test', 'published')),
  to_status text not null check (to_status in ('draft', 'review', 'test', 'published')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.roadmap_version_events enable row level security;
create policy "admin read roadmap version events" on public.roadmap_version_events
  for select to authenticated using (public.is_admin());
grant select on public.roadmap_version_events to authenticated;

drop policy if exists "published roadmap versions read" on public.roadmap_versions;
create policy "published roadmap versions read" on public.roadmap_versions
  for select to authenticated, anon using (status = 'published');
create policy "admin roadmap versions read" on public.roadmap_versions
  for select to authenticated using (public.is_admin());
drop policy if exists "admin write: roadmap_versions" on public.roadmap_versions;
revoke insert, update, delete on public.roadmap_versions from authenticated;
grant select on public.roadmap_versions to authenticated, anon;

drop policy if exists "published roadmap phases read" on public.roadmap_phases;
drop policy if exists "published roadmap modules read" on public.roadmap_modules;
drop policy if exists "published roadmap topics read" on public.roadmap_topics;
drop policy if exists "published roadmap projects read" on public.roadmap_projects;

create policy "published roadmap phases read" on public.roadmap_phases
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.roadmaps r
      join public.roadmap_versions v on v.roadmap_id = r.id
      where r.id = public.roadmap_phases.roadmap_id
        and v.id = public.roadmap_phases.roadmap_version_id
        and v.status = 'published' and r.is_public and v.is_current
    )
    or exists (
      select 1 from public.user_roadmaps ur
      join public.roadmap_versions v on v.id = ur.roadmap_version_id
      where ur.user_id = auth.uid()
        and ur.roadmap_id = public.roadmap_phases.roadmap_id
        and ur.roadmap_version_id = public.roadmap_phases.roadmap_version_id
        and ur.status = 'active' and v.status = 'published'
    )
  );
create policy "published roadmap modules read" on public.roadmap_modules
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.roadmap_phases p
      join public.roadmaps r on r.id = p.roadmap_id
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where p.id = public.roadmap_modules.phase_id and v.status = 'published'
        and ((r.is_public and v.is_current) or exists (
          select 1 from public.user_roadmaps ur
          where ur.user_id = auth.uid() and ur.roadmap_id = r.id
            and ur.roadmap_version_id = v.id and ur.status = 'active'
        ))
    )
  );
create policy "published roadmap topics read" on public.roadmap_topics
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.roadmap_modules m
      join public.roadmap_phases p on p.id = m.phase_id
      join public.roadmaps r on r.id = p.roadmap_id
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where m.id = public.roadmap_topics.module_id and v.status = 'published'
        and ((r.is_public and v.is_current) or exists (
          select 1 from public.user_roadmaps ur
          where ur.user_id = auth.uid() and ur.roadmap_id = r.id
            and ur.roadmap_version_id = v.id and ur.status = 'active'
        ))
    )
  );
create policy "published roadmap projects read" on public.roadmap_projects
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.roadmap_phases p
      join public.roadmaps r on r.id = p.roadmap_id
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where p.id = public.roadmap_projects.phase_id and v.status = 'published'
        and ((r.is_public and v.is_current) or exists (
          select 1 from public.user_roadmaps ur
          where ur.user_id = auth.uid() and ur.roadmap_id = r.id
            and ur.roadmap_version_id = v.id and ur.status = 'active'
        ))
    )
  );

-- Admins may change curriculum rows only while their owning version is a
-- draft. Review, test, and published content is read-only through PostgREST.
drop policy if exists "admin write: roadmap phases" on public.roadmap_phases;
drop policy if exists "admin write: roadmap modules" on public.roadmap_modules;
drop policy if exists "admin write: roadmap topics" on public.roadmap_topics;
drop policy if exists "admin write: roadmap projects" on public.roadmap_projects;
create policy "admin edit draft roadmap phases" on public.roadmap_phases
  for all to authenticated using (
    public.is_admin() and exists (
      select 1 from public.roadmap_versions v
      where v.id = public.roadmap_phases.roadmap_version_id and v.status = 'draft'
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.roadmap_versions v
      where v.id = public.roadmap_phases.roadmap_version_id and v.status = 'draft'
    )
  );
create policy "admin edit draft roadmap modules" on public.roadmap_modules
  for all to authenticated using (
    public.is_admin() and exists (
      select 1 from public.roadmap_phases p
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where p.id = public.roadmap_modules.phase_id and v.status = 'draft'
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.roadmap_phases p
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where p.id = public.roadmap_modules.phase_id and v.status = 'draft'
    )
  );
create policy "admin edit draft roadmap topics" on public.roadmap_topics
  for all to authenticated using (
    public.is_admin() and exists (
      select 1 from public.roadmap_modules m
      join public.roadmap_phases p on p.id = m.phase_id
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where m.id = public.roadmap_topics.module_id and v.status = 'draft'
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.roadmap_modules m
      join public.roadmap_phases p on p.id = m.phase_id
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where m.id = public.roadmap_topics.module_id and v.status = 'draft'
    )
  );
create policy "admin edit draft roadmap projects" on public.roadmap_projects
  for all to authenticated using (
    public.is_admin() and exists (
      select 1 from public.roadmap_phases p
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where p.id = public.roadmap_projects.phase_id and v.status = 'draft'
    )
  ) with check (
    public.is_admin() and exists (
      select 1 from public.roadmap_phases p
      join public.roadmap_versions v on v.id = p.roadmap_version_id
      where p.id = public.roadmap_projects.phase_id and v.status = 'draft'
    )
  );

create or replace function public.create_roadmap_draft(p_roadmap_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_version_id uuid;
  new_version_id uuid;
  next_version_number int;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'administrator access required';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_roadmap_id));

  select v.id into source_version_id
  from public.roadmap_versions v
  where v.roadmap_id = p_roadmap_id and v.is_current and v.status = 'published'
  for share;
  if source_version_id is null then
    raise exception 'roadmap has no current published version';
  end if;
  if not exists (
    select 1 from public.roadmap_phases p where p.roadmap_version_id = source_version_id
  ) then
    raise exception 'roadmap version has no detailed phases to copy';
  end if;

  select coalesce(max(v.version_number), 0) + 1 into next_version_number
  from public.roadmap_versions v where v.roadmap_id = p_roadmap_id;

  insert into public.roadmap_versions (
    roadmap_id, version_number, label, is_current, status, created_by, released_at, published_at
  ) values (
    p_roadmap_id, next_version_number, 'v' || next_version_number || '.0 draft', false,
    'draft', auth.uid(), now(), null
  ) returning id into new_version_id;
  insert into public.roadmap_version_events (roadmap_version_id, from_status, to_status, changed_by)
  values (new_version_id, null, 'draft', auth.uid());

  insert into public.roadmap_phases (
    id, roadmap_id, roadmap_version_id, phase_number, title, band,
    description, estimated_hours, order_index
  )
  select p.id || '-v' || next_version_number, p.roadmap_id, new_version_id,
    p.phase_number, p.title, p.band, p.description, p.estimated_hours, p.order_index
  from public.roadmap_phases p where p.roadmap_version_id = source_version_id;

  insert into public.roadmap_modules (
    id, phase_id, module_number, title, description, estimated_hours, order_index
  )
  select m.id || '-v' || next_version_number, m.phase_id || '-v' || next_version_number,
    m.module_number, m.title, m.description, m.estimated_hours, m.order_index
  from public.roadmap_modules m
  join public.roadmap_phases p on p.id = m.phase_id
  where p.roadmap_version_id = source_version_id;

  insert into public.roadmap_topics (
    id, module_id, title, learning_objectives, practice_tasks, completion_evidence,
    estimated_minutes, difficulty, order_index, prerequisite_topic_ids, learning_resources
  )
  select t.id || '-v' || next_version_number, t.module_id || '-v' || next_version_number,
    t.title, t.learning_objectives, t.practice_tasks, t.completion_evidence,
    t.estimated_minutes, t.difficulty, t.order_index,
    coalesce(array(
      select prerequisite_id || '-v' || next_version_number
      from unnest(t.prerequisite_topic_ids) as prerequisite(prerequisite_id)
    ), '{}'::text[]),
    t.learning_resources
  from public.roadmap_topics t
  join public.roadmap_modules m on m.id = t.module_id
  join public.roadmap_phases p on p.id = m.phase_id
  where p.roadmap_version_id = source_version_id;

  insert into public.roadmap_projects (
    id, phase_id, title, problem_statement, requirements, milestones,
    deliverables, skills, difficulty, order_index
  )
  select pr.id || '-v' || next_version_number, pr.phase_id || '-v' || next_version_number,
    pr.title, pr.problem_statement, pr.requirements, pr.milestones,
    pr.deliverables, pr.skills, pr.difficulty, pr.order_index
  from public.roadmap_projects pr
  join public.roadmap_phases p on p.id = pr.phase_id
  where p.roadmap_version_id = source_version_id;

  return new_version_id;
end;
$$;

create or replace function public.set_roadmap_version_status(
  p_roadmap_version_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  version_roadmap_id text;
  old_status text;
  was_current boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'administrator access required';
  end if;
  if p_status not in ('draft', 'review', 'test', 'published') then
    raise exception 'invalid roadmap version status';
  end if;

  select v.roadmap_id, v.status, v.is_current
    into version_roadmap_id, old_status, was_current
  from public.roadmap_versions v
  where v.id = p_roadmap_version_id
  for update;
  if version_roadmap_id is null then raise exception 'roadmap version not found'; end if;
  if p_status = old_status and (p_status <> 'published' or was_current) then return; end if;

  if p_status = 'review' and old_status = 'draft' then
    if not exists (select 1 from public.roadmap_phases p where p.roadmap_version_id = p_roadmap_version_id) then
      raise exception 'a version needs at least one phase before review';
    end if;
    if exists (select 1 from public.roadmap_phases p where p.roadmap_version_id = p_roadmap_version_id
      and (length(trim(p.description)) < 30
        or not exists (select 1 from public.roadmap_modules m where m.phase_id = p.id)
        or not exists (select 1 from public.roadmap_projects rp where rp.phase_id = p.id))) then
      raise exception 'every phase needs a detailed description, at least one module, and an applied project';
    end if;
    if exists (select 1 from public.roadmap_modules m join public.roadmap_phases p on p.id = m.phase_id
      where p.roadmap_version_id = p_roadmap_version_id
        and (length(trim(m.title)) < 3 or length(trim(m.description)) < 30
          or not exists (select 1 from public.roadmap_topics t where t.module_id = m.id))) then
      raise exception 'every module needs a detailed description and at least one topic';
    end if;
    if exists (select 1 from public.roadmap_topics t
      join public.roadmap_modules m on m.id = t.module_id
      join public.roadmap_phases p on p.id = m.phase_id
      where p.roadmap_version_id = p_roadmap_version_id
        and (length(trim(t.title)) < 4 or cardinality(t.learning_objectives) < 2
          or cardinality(t.practice_tasks) < 2 or cardinality(t.completion_evidence) < 1)) then
      raise exception 'every topic needs objectives, practice, and completion evidence';
    end if;
    if exists (select 1 from public.roadmap_topics t
      join public.roadmap_modules m on m.id = t.module_id
      join public.roadmap_phases p on p.id = m.phase_id
      cross join lateral unnest(t.prerequisite_topic_ids) as prerequisite(topic_id)
      where p.roadmap_version_id = p_roadmap_version_id
        and not exists (select 1 from public.roadmap_topics target
          join public.roadmap_modules target_module on target_module.id = target.module_id
          join public.roadmap_phases target_phase on target_phase.id = target_module.phase_id
          where target.id = prerequisite.topic_id and target_phase.roadmap_version_id = p_roadmap_version_id)) then
      raise exception 'every prerequisite must point to a topic in this version';
    end if;
    if exists (
      with recursive topic_edges as (
        select t.id as topic_id, prerequisite.topic_id as prerequisite_topic_id
        from public.roadmap_topics t
        join public.roadmap_modules m on m.id = t.module_id
        join public.roadmap_phases p on p.id = m.phase_id
        cross join lateral unnest(t.prerequisite_topic_ids) as prerequisite(topic_id)
        where p.roadmap_version_id = p_roadmap_version_id
      ), dependency_walk(start_id, current_id, path, has_cycle) as (
        select edge.topic_id, edge.prerequisite_topic_id,
          array[edge.topic_id, edge.prerequisite_topic_id]::text[],
          edge.topic_id = edge.prerequisite_topic_id
        from topic_edges edge
        union all
        select walk.start_id, edge.prerequisite_topic_id,
          walk.path || edge.prerequisite_topic_id,
          edge.prerequisite_topic_id = any(walk.path)
        from dependency_walk walk
        join topic_edges edge on edge.topic_id = walk.current_id
        where not walk.has_cycle
      )
      select 1 from dependency_walk where has_cycle
    ) then
      raise exception 'topic prerequisites cannot contain a cycle';
    end if;
    if exists (select 1 from public.roadmap_projects rp
      join public.roadmap_phases p on p.id = rp.phase_id
      where p.roadmap_version_id = p_roadmap_version_id
        and (length(trim(rp.title)) < 4 or length(trim(rp.problem_statement)) < 30
          or cardinality(rp.requirements) < 2 or cardinality(rp.milestones) < 2
          or cardinality(rp.deliverables) < 2 or cardinality(rp.skills) < 1)) then
      raise exception 'every project needs a clear problem, requirements, milestones, deliverables, and skills';
    end if;
    if exists (select 1 from public.roadmap_topics t
      join public.roadmap_modules m on m.id = t.module_id
      join public.roadmap_phases p on p.id = m.phase_id
      where p.roadmap_version_id = p_roadmap_version_id and jsonb_typeof(t.learning_resources) <> 'array') then
      raise exception 'learning resources must be stored as a list';
    end if;
    if exists (select 1 from public.roadmap_topics t
      join public.roadmap_modules m on m.id = t.module_id
      join public.roadmap_phases p on p.id = m.phase_id
      cross join lateral jsonb_array_elements(t.learning_resources) as resource(value)
      where p.roadmap_version_id = p_roadmap_version_id
        and (jsonb_typeof(resource.value) <> 'object'
          or coalesce(resource.value ->> 'label', '') = ''
          or coalesce(resource.value ->> 'url', '') !~ '^https?://')) then
      raise exception 'every resource must have a label and safe HTTP or HTTPS URL';
    end if;
  end if;

  if p_status = 'draft' and old_status <> 'draft' then
    raise exception 'create a new draft to make further edits';
  elsif p_status = 'review' and old_status not in ('draft', 'review') then
    raise exception 'only a draft can enter review';
  elsif p_status = 'test' and old_status not in ('review', 'test') then
    raise exception 'a version must pass review before testing';
  elsif p_status = 'published' and old_status <> 'test' then
    raise exception 'a version must pass review and testing before publishing';
  end if;

  if p_status = 'published' then
    update public.roadmap_versions
    set is_current = false
    where roadmap_id = version_roadmap_id and is_current and id <> p_roadmap_version_id;
    update public.roadmap_versions
    set status = 'published', is_current = true, published_at = now(), released_at = now(),
      label = regexp_replace(coalesce(label, 'v' || version_number || '.0'), ' draft$', '')
    where id = p_roadmap_version_id;
  else
    if was_current then raise exception 'the current published version cannot be unpublished'; end if;
    update public.roadmap_versions set status = p_status where id = p_roadmap_version_id;
  end if;
  insert into public.roadmap_version_events (roadmap_version_id, from_status, to_status, changed_by)
  values (p_roadmap_version_id, old_status, p_status, auth.uid());
end;
$$;

revoke all on function public.create_roadmap_draft(text) from public, anon;
revoke all on function public.set_roadmap_version_status(uuid, text) from public, anon;
grant execute on function public.create_roadmap_draft(text) to authenticated;
grant execute on function public.set_roadmap_version_status(uuid, text) to authenticated;

comment on column public.roadmap_versions.status is
  'Content workflow state. Only published versions are visible to learners; edits happen in cloned drafts.';
