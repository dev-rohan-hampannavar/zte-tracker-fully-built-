-- ============================================================================
-- PHASE 8 — Additional public roadmap tracks: assignment infrastructure
--
-- Honest scope note, written before anything else in this file: the
-- master prompt's Phase 8 asks for real, deeply detailed additional
-- roadmaps (frontend / backend / full-stack tracks, each at the same
-- depth as the existing ~21-phase, ~375-topic curriculum). Authoring a
-- second curriculum at matching depth is a content-creation effort, not
-- a schema-design one — it requires the same kind of hand-built subject-
-- matter work the existing curriculum represents, and fabricating that
-- content in this migration to make Phase 8 look "done" would be worse
-- than not doing it: it would either be shallow (which the master
-- prompt explicitly says not to ship) or plausible-sounding invented
-- curriculum passed off as real. Neither belongs in a production
-- database.
--
-- What this migration builds instead is the piece of Phase 8 that IS a
-- schema/mechanism concern: a real, data-driven lookup from a user's
-- target_role_id to the roadmap they should be assigned, replacing the
-- hardcoded `roadmapId: string = "zte-core-v1"` default that's been
-- sitting in completeOnboarding() (src/lib/hooks/use-onboarding.ts)
-- since Phase 6. Today every role resolves to the one roadmap that
-- exists, because that's the honest state of the data — but the
-- resolution is now a real query against a real table, so adding a
-- second roadmap later (once its content actually exists) is a data
-- insert into this table, not a code change. This is the same principle
-- Phase 19 states directly: "stop requiring code changes for every
-- curriculum update."
-- ============================================================================

create table if not exists public.role_roadmap_assignments (
  role_id text not null references public.target_roles(id) on delete cascade,
  roadmap_id text not null references public.roadmaps(id) on delete cascade,
  -- Lower priority wins when a role has more than one eligible roadmap
  -- (e.g. once a frontend-specific roadmap exists, frontend-developer
  -- might have both it and the full-stack roadmap as viable — priority
  -- picks the more specific one first). Today every role has exactly
  -- one row, so priority is inert, but the column exists now so it
  -- doesn't need a schema change when it stops being inert.
  priority int not null default 0,
  primary key (role_id, roadmap_id)
);

comment on table public.role_roadmap_assignments is
  'Data-driven role -> roadmap resolution, replacing a hardcoded default '
  'in completeOnboarding(). Every row today points at zte-core-v1 '
  'because it is the only roadmap that exists — this table is real '
  'infrastructure for Phase 8, not a claim that multiple tracks already '
  'exist. Adding a real second track later is an insert here plus the '
  'actual curriculum content migration, never an application code change.';

alter table public.role_roadmap_assignments enable row level security;

create policy "static read: role_roadmap_assignments" on public.role_roadmap_assignments
  for select to authenticated using (true);
create policy "static read (anon): role_roadmap_assignments" on public.role_roadmap_assignments
  for select to anon using (true);

-- Seed: every existing target_role points at the one existing roadmap.
-- This is a statement of current fact, not a design claim that these
-- roles are meaningfully differentiated yet — they aren't, because
-- there's one curriculum. select ... from target_roles rather than a
-- hand-typed list of role ids, so this migration doesn't drift out of
-- sync with whatever roles 0033_project_skills_readiness.sql actually
-- seeded (including any added since).
insert into public.role_roadmap_assignments (role_id, roadmap_id, priority)
select id, 'zte-core-v1', 0
from public.target_roles
on conflict (role_id, roadmap_id) do nothing;
