-- ============================================================================
-- PHASE 4 of the Career OS build: Skill Evidence Engine + Freshness/Decay.
--
-- The existing /skills page tracks roadmap-band completion and DSA-by-tag,
-- which is real and useful, but not a per-skill (React, PostgreSQL, Docker)
-- confidence score backed by evidence as the spec asks for. The building
-- blocks for that already exist and are reused rather than duplicated:
--   - technologies (0011): the skill taxonomy itself (id, name, category)
--   - topic_technologies (0011): which roadmap topics teach which skill
--   - topic_progress (0001): completed/completed_at/last_reviewed per topic
--
-- skill_evidence is therefore a VIEW, not a table — every number in it is
-- computed live from data that already exists, so it can never drift from
-- reality (the "no fake analytics" / "every metric must be traceable"
-- rules). It deliberately does NOT fold in DSA progress: dsa_progress.
-- topic_tag is free-text ("Arrays", "Graphs", ...) with no FK to
-- technologies, so any auto-join would be a guessed string match — that's
-- exactly the kind of fabricated-looking evidence the spec prohibits.
-- Project and interview evidence are intentionally left as extension
-- points (see project_skills / interview evidence added in Phases 5-6)
-- rather than invented here with fake defaults.
--
-- Freshness/decay: configurable via skill_freshness_config (single row,
-- not hardcoded thresholds scattered through the UI), computed from the
-- most recent last_reviewed/completed_at across a skill's linked topics.
-- ============================================================================

create table if not exists public.skill_freshness_config (
  id int primary key default 1,
  fresh_within_days int not null default 14,
  aging_within_days int not null default 45,
  -- beyond aging_within_days => stale
  constraint skill_freshness_config_single_row check (id = 1)
);
insert into public.skill_freshness_config (id) values (1) on conflict (id) do nothing;

alter table public.skill_freshness_config enable row level security;
create policy "read: skill_freshness_config" on public.skill_freshness_config
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- Manual skill declarations: skills the user wants tracked that either
-- aren't in the curriculum's technologies list, or where they want to
-- record evidence (projects, interview prep) not derivable from roadmap
-- topics alone. Distinct from technologies (curriculum-driven, shared
-- reference data) — this is per-user, e.g. "Redux Toolkit" if it isn't
-- already a seeded technology.
-- ----------------------------------------------------------------------------
create table if not exists public.user_skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  technology_id text references public.technologies(id) on delete set null,
  custom_name text, -- used when technology_id is null (skill not in curriculum taxonomy)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_skills_name_source check (technology_id is not null or custom_name is not null)
);
create unique index if not exists idx_user_skills_user_tech on public.user_skills(user_id, technology_id) where technology_id is not null;
create index if not exists idx_user_skills_user on public.user_skills(user_id);

create trigger set_user_skills_updated_at
  before update on public.user_skills
  for each row execute function public.set_updated_at();

alter table public.user_skills enable row level security;
create policy "own rows: user_skills" on public.user_skills
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- skill_evidence: one row per (user, technology) with real lesson-based
-- evidence. Only technologies with at least one linked topic produce a
-- row (no row = no evidence yet, not a fabricated 0%).
-- ----------------------------------------------------------------------------
create or replace view public.skill_evidence as
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
group by tp.user_id, t.id, t.name, t.category;

grant select on public.skill_evidence to authenticated;

-- ----------------------------------------------------------------------------
-- skill_freshness: freshness state derived from the more recent of
-- last_reviewed / last_completed_at, against the configurable thresholds
-- above. Kept as a separate view (rather than folded into skill_evidence)
-- so the freshness computation has one place to change.
-- ----------------------------------------------------------------------------
create or replace view public.skill_freshness as
select
  se.user_id,
  se.technology_id,
  se.technology_name,
  greatest(se.last_reviewed_at, se.last_completed_at) as last_activity_at,
  case
    when greatest(se.last_reviewed_at, se.last_completed_at) is null then 'never'
    when greatest(se.last_reviewed_at, se.last_completed_at) >= now() - (cfg.fresh_within_days || ' days')::interval then 'fresh'
    when greatest(se.last_reviewed_at, se.last_completed_at) >= now() - (cfg.aging_within_days || ' days')::interval then 'aging'
    else 'stale'
  end as freshness
from public.skill_evidence se
cross join public.skill_freshness_config cfg
where cfg.id = 1;

grant select on public.skill_freshness to authenticated;

-- ============================================================================
-- Fix reset_user_progress(): user_skills (Phase 4) is per-user declared
-- data, same category as goals/career_tracker — a reset should clear it.
-- skill_evidence / skill_freshness are views with no rows of their own
-- (derived from topic_progress, already wiped), so nothing to add there.
-- ============================================================================
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
end;
$$;

grant execute on function public.reset_user_progress() to authenticated;
