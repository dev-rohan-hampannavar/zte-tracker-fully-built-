-- ============================================================================
-- PHASE 5 of the Career OS build: Project <-> Skill Mapping + Job
-- Readiness Score.
--
-- project-dependencies.ts already derives a *display-only* technology list
-- per stage project by text-matching its curriculum description against
-- the technologies table (documented there as a deliberate choice over a
-- hand-authored join table, for stage projects specifically). That stays
-- exactly as-is — it's a good lightweight suggestion mechanism.
--
-- For actual skill EVIDENCE, a text-derived guess isn't good enough: what
-- the curriculum description mentions isn't necessarily what a person
-- really built (they may have used a different library, or the curriculum
-- description may be generic). This migration adds project_skills — a
-- persisted, user-confirmed link — covering BOTH existing project
-- systems (phase-based stage/capstone projects AND advanced_projects
-- portfolio ideas) via a single polymorphic-ish table with two nullable
-- FK columns and a check that exactly one is set, rather than building a
-- third parallel "projects" table.
-- ============================================================================

create table if not exists public.project_skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_id text references public.phases(id) on delete cascade,
  advanced_project_id text references public.advanced_projects(id) on delete cascade,
  technology_id text not null references public.technologies(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint project_skills_one_project check (
    (phase_id is not null and advanced_project_id is null) or
    (phase_id is null and advanced_project_id is not null)
  )
);
create unique index if not exists idx_project_skills_unique_phase
  on public.project_skills(user_id, phase_id, technology_id) where phase_id is not null;
create unique index if not exists idx_project_skills_unique_advanced
  on public.project_skills(user_id, advanced_project_id, technology_id) where advanced_project_id is not null;
create index if not exists idx_project_skills_user_tech on public.project_skills(user_id, technology_id);

alter table public.project_skills enable row level security;
create policy "own rows: project_skills" on public.project_skills
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Extend skill_evidence with project counts. Recreated (not altered) since
-- it's a view; adds project_count (projects marked in_progress/completed
-- that this technology is linked to, across both project systems) without
-- changing any existing column, so nothing reading the old shape breaks.
-- ----------------------------------------------------------------------------
create or replace view public.skill_evidence as
select
  base.user_id,
  base.technology_id,
  base.technology_name,
  base.technology_category,
  base.lessons_total,
  base.lessons_completed,
  base.knowledge_pct,
  base.last_reviewed_at,
  base.last_completed_at,
  coalesce(proj.project_count, 0) as project_count
from (
  select
    tp.user_id,
    t.id as technology_id,
    t.name as technology_name,
    t.category as technology_category,
    count(distinct tt.topic_id) as lessons_total,
    count(distinct tt.topic_id) filter (where tp.completed) as lessons_completed,
    case when count(distinct tt.topic_id) = 0 then 0
      else round(100.0 * count(distinct tt.topic_id) filter (where tp.completed) / count(distinct tt.topic_id))
    end as knowledge_pct,
    max(tp.last_reviewed) as last_reviewed_at,
    max(tp.completed_at) as last_completed_at
  from public.technologies t
  join public.topic_technologies tt on tt.technology_id = t.id
  left join public.topic_progress tp on tp.topic_id = tt.topic_id
  group by tp.user_id, t.id, t.name, t.category
) base
left join (
  select ps.user_id, ps.technology_id, count(distinct coalesce(ps.phase_id, ps.advanced_project_id)) as project_count
  from public.project_skills ps
  left join public.project_progress pp on pp.phase_id = ps.phase_id and pp.user_id = ps.user_id
  left join public.advanced_project_progress app on app.project_id = ps.advanced_project_id and app.user_id = ps.user_id
  where coalesce(pp.status, 'not_started') <> 'not_started' or coalesce(app.status, 'not_started') not in ('not_started', 'considering')
  group by ps.user_id, ps.technology_id
) proj on proj.user_id = base.user_id and proj.technology_id = base.technology_id;

grant select on public.skill_evidence to authenticated;

-- ============================================================================
-- Job Readiness Score.
--
-- Target roles are a small, explainable, curated set (not free-text) so
-- the "required skills" weighting is meaningful rather than user-invented
-- noise. role_skill_requirements defines, per role, which technologies
-- matter and how much (weight). The score itself is computed in the
-- application layer (not a giant SQL view) because it blends several
-- already-separate data sources (skill_evidence, dsa_progress via
-- dsa_progress_summary below, career_tracker via application_metrics,
-- resume/portfolio existence flags from user_settings) with an explicit,
-- inspectable formula that needs to show its own working in the UI per
-- the "never a mysterious arbitrary percentage" rule — a single opaque
-- SQL expression would be harder to explain back to the user than a
-- typed TS function operating on these building-block views.
-- ============================================================================

create table if not exists public.target_roles (
  id text primary key, -- e.g. 'frontend-developer'
  name text not null,
  description text
);
insert into public.target_roles (id, name, description) values
  ('frontend-developer', 'Frontend Developer', 'React/Next.js-focused UI engineering roles'),
  ('backend-developer', 'Backend Developer', 'API, database, and server-side focused roles'),
  ('fullstack-developer', 'Full-Stack Developer', 'End-to-end web application roles'),
  ('sde-1', 'SDE-1 / Junior Software Engineer', 'General entry-level software engineering roles')
on conflict (id) do nothing;

alter table public.target_roles enable row level security;
create policy "read: target_roles" on public.target_roles for select to authenticated using (true);

create table if not exists public.role_skill_requirements (
  role_id text not null references public.target_roles(id) on delete cascade,
  technology_id text not null references public.technologies(id) on delete cascade,
  weight numeric(3,2) not null default 1.0 check (weight > 0),
  primary key (role_id, technology_id)
);

alter table public.role_skill_requirements enable row level security;
create policy "read: role_skill_requirements" on public.role_skill_requirements for select to authenticated using (true);

-- Seed role requirements only for technologies that actually exist in this
-- deployment's seeded technologies table, so the readiness score never
-- silently references a skill with zero possible evidence behind it.
insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'frontend-developer', t.id, w.weight
from public.technologies t
join (values
  ('React', 1.0), ('TypeScript', 0.9), ('JavaScript', 1.0), ('Next.js', 0.7),
  ('CSS', 0.6), ('HTML', 0.4), ('Redux', 0.4), ('Tailwind CSS', 0.4)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'backend-developer', t.id, w.weight
from public.technologies t
join (values
  ('Node.js', 1.0), ('Express', 0.6), ('PostgreSQL', 0.9), ('SQL', 0.7),
  ('REST', 0.6), ('Docker', 0.5), ('JWT', 0.4), ('Redis', 0.3)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'fullstack-developer', t.id, w.weight
from public.technologies t
join (values
  ('React', 0.9), ('TypeScript', 0.8), ('JavaScript', 0.9), ('Node.js', 0.9),
  ('PostgreSQL', 0.8), ('REST', 0.6), ('Next.js', 0.6), ('Docker', 0.4)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'sde-1', t.id, w.weight
from public.technologies t
join (values
  ('JavaScript', 1.0), ('Git', 0.7), ('SQL', 0.6), ('REST', 0.5)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Fix reset_user_progress(): project_skills (Phase 5) is per-user declared
-- data, same category as user_skills.
-- ----------------------------------------------------------------------------
create or replace function public.reset_user_progress()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.topic_progress where user_id = auth.uid();
  delete from public.daily_logs where user_id = auth.uid();
  delete from public.topic_notes where user_id = auth.uid();
  delete from public.project_progress where user_id = auth.uid();
  delete from public.dsa_progress where user_id = auth.uid();
  delete from public.career_tracker where user_id = auth.uid();
  delete from public.topic_resources where user_id = auth.uid();
  delete from public.advanced_project_progress where user_id = auth.uid();
  delete from public.exercise_progress where user_id = auth.uid();
  delete from public.build_in_public_status where user_id = auth.uid();
  delete from public.manual_item_checks where user_id = auth.uid();
  delete from public.public_streak_summary where user_id = auth.uid();
  delete from public.study_sessions where user_id = auth.uid();
  delete from public.focus_sessions where user_id = auth.uid();
  delete from public.milestones where user_id = auth.uid();
  delete from public.goals where user_id = auth.uid();
  delete from public.interview_rounds where user_id = auth.uid();
  delete from public.user_skills where user_id = auth.uid();
  delete from public.project_skills where user_id = auth.uid();
end;
$$;

grant execute on function public.reset_user_progress() to authenticated;
