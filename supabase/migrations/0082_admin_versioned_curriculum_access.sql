-- Let administrators manage the shared, versioned curriculum through the
-- authenticated app while keeping regular users read-only.
drop policy if exists "static read: roadmap_versions" on public.roadmap_versions;
drop policy if exists "static read (anon): roadmap_versions" on public.roadmap_versions;
create policy "published roadmap versions read" on public.roadmap_versions
  for select to authenticated, anon using (true);
create policy "admin write: roadmap_versions" on public.roadmap_versions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "published roadmap phases read" on public.roadmap_phases;
drop policy if exists "published roadmap modules read" on public.roadmap_modules;
drop policy if exists "published roadmap topics read" on public.roadmap_topics;
drop policy if exists "published roadmap projects read" on public.roadmap_projects;

create policy "published roadmap phases read" on public.roadmap_phases
  for select to authenticated using (
    exists (
      select 1 from public.roadmaps r
      join public.roadmap_versions v on v.roadmap_id = r.id
      where r.id = public.roadmap_phases.roadmap_id
        and v.id = public.roadmap_phases.roadmap_version_id and r.is_public
    )
    or exists (
      select 1 from public.user_roadmaps ur
      where ur.user_id = auth.uid() and ur.roadmap_id = public.roadmap_phases.roadmap_id
        and ur.roadmap_version_id = public.roadmap_phases.roadmap_version_id and ur.status = 'active'
    )
  );
create policy "published roadmap modules read" on public.roadmap_modules
  for select to authenticated using (exists (
    select 1 from public.roadmap_phases p
    join public.roadmaps r on r.id = p.roadmap_id
    join public.roadmap_versions v on v.id = p.roadmap_version_id
    where p.id = public.roadmap_modules.phase_id and (r.is_public or exists (
      select 1 from public.user_roadmaps ur
      where ur.user_id = auth.uid() and ur.roadmap_id = r.id
        and ur.roadmap_version_id = v.id and ur.status = 'active'
    ))
  ));
create policy "published roadmap topics read" on public.roadmap_topics
  for select to authenticated using (exists (
    select 1 from public.roadmap_modules m
    join public.roadmap_phases p on p.id = m.phase_id
    join public.roadmaps r on r.id = p.roadmap_id
    join public.roadmap_versions v on v.id = p.roadmap_version_id
    where m.id = public.roadmap_topics.module_id and (r.is_public or exists (
      select 1 from public.user_roadmaps ur
      where ur.user_id = auth.uid() and ur.roadmap_id = r.id
        and ur.roadmap_version_id = v.id and ur.status = 'active'
    ))
  ));
create policy "published roadmap projects read" on public.roadmap_projects
  for select to authenticated using (exists (
    select 1 from public.roadmap_phases p
    join public.roadmaps r on r.id = p.roadmap_id
    join public.roadmap_versions v on v.id = p.roadmap_version_id
    where p.id = public.roadmap_projects.phase_id and (r.is_public or exists (
      select 1 from public.user_roadmaps ur
      where ur.user_id = auth.uid() and ur.roadmap_id = r.id
        and ur.roadmap_version_id = v.id and ur.status = 'active'
    ))
  ));

create policy "admin write: roadmap phases" on public.roadmap_phases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write: roadmap modules" on public.roadmap_modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write: roadmap topics" on public.roadmap_topics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write: roadmap projects" on public.roadmap_projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write: role roadmap assignments" on public.role_roadmap_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant insert, update, delete on public.roadmap_versions, public.roadmap_phases,
  public.roadmap_modules, public.roadmap_topics, public.roadmap_projects,
  public.role_roadmap_assignments to authenticated;
