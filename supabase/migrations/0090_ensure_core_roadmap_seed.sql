-- Onboarding failed with "selected roadmap does not exist" whenever the
-- shared core curriculum row was missing from public.roadmaps. 110 of the 118
-- catalog roles (and any user who skips the role step) resolve to
-- 'zte-core-v1' because they have no detailed-track assignment, so a missing
-- core row blocks almost every signup. Migration 0070 seeds it, but a database
-- restored/reset after 0070 (or one where migrations ran out of order) can
-- lose it. Everything below is idempotent: safe on healthy databases.

insert into public.roadmaps (id, title, track, description, is_public)
values ('zte-core-v1', 'Zero to Elite', 'full-stack', 'The original hand-built ZTE curriculum.', true)
on conflict (id) do update set is_public = true;

-- Exactly one current, published version must exist for the core roadmap.
insert into public.roadmap_versions (roadmap_id, version_number, label, is_current, status, published_at)
select 'zte-core-v1', 1, 'v1.0', true, 'published', now()
where not exists (
  select 1 from public.roadmap_versions v where v.roadmap_id = 'zte-core-v1'
)
on conflict (roadmap_id, version_number) do nothing;

update public.roadmap_versions v
set is_current = true
where v.roadmap_id = 'zte-core-v1'
  and v.version_number = (
    select min(x.version_number) from public.roadmap_versions x where x.roadmap_id = 'zte-core-v1'
  )
  and not exists (
    select 1 from public.roadmap_versions c where c.roadmap_id = 'zte-core-v1' and c.is_current
  );

-- Fail loudly at migration time (not at a user's onboarding click) if the
-- seed still isn't in place.
do $$
begin
  if not exists (select 1 from public.roadmaps where id = 'zte-core-v1') then
    raise exception 'zte-core-v1 roadmap seed is missing after migration 0090';
  end if;
  if not exists (
    select 1 from public.roadmap_versions where roadmap_id = 'zte-core-v1' and is_current
  ) then
    raise exception 'zte-core-v1 has no current roadmap version after migration 0090';
  end if;
end $$;
