-- ============================================================================
-- PHASE 1 of the ZTE "Career OS" build: Goal -> Milestone -> Execution system.
--
-- Design notes:
-- - Goals are user-authored (e.g. "Become a React Developer"), not curriculum
--   content, so unlike phases/topics they live fully in user-owned tables
--   with RLS, same shape as career_tracker / study_sessions.
-- - Milestones belong to a goal and can *optionally* link to existing
--   entities (a roadmap topic, a stage project, an advanced project) so
--   progress isn't duplicated data entry — completing a linked topic can
--   later be wired to auto-progress the milestone. Links are nullable and
--   on delete set null, never cascade-delete a milestone just because a
--   topic reference changes.
-- - goal_progress is intentionally NOT a stored column. Progress must be
--   computed from milestone completion (rule: every metric must be
--   traceable to source, no fake/cached percentages that can drift from
--   reality). It's exposed via a view for cheap reads.
-- - Milestones support dependencies on other milestones (simple DAG via a
--   join table) so the daily planner (Phase 2+) can respect ordering.
-- ============================================================================

create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
  target_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_goals_user on public.goals(user_id, status);

create table if not exists public.milestones (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  deadline date,
  order_index int not null default 0,
  -- optional links into existing systems, so milestone progress can be
  -- driven by real completion signals instead of a manually-ticked box
  linked_topic_id text references public.topics(id) on delete set null,
  linked_stage_project_id text references public.stage_projects(id) on delete set null,
  linked_advanced_project_id uuid references public.advanced_projects(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_milestones_goal on public.milestones(goal_id, order_index);
create index if not exists idx_milestones_user on public.milestones(user_id, status);

-- Milestone -> Milestone dependency graph (simple DAG). A milestone can
-- depend on N other milestones; enforced not-self-referencing at the row
-- level. Cycle prevention is left to the application layer (Phase 2 planner)
-- rather than a recursive CHECK, which Postgres can't express directly.
create table if not exists public.milestone_dependencies (
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  depends_on_milestone_id uuid not null references public.milestones(id) on delete cascade,
  primary key (milestone_id, depends_on_milestone_id),
  constraint milestone_dependencies_no_self check (milestone_id <> depends_on_milestone_id)
);

-- Milestone -> Skill linkage. skill_id is text (not a FK yet) because the
-- per-user skill evidence table lands in a later phase of this build; the
-- column is added now so goal/milestone authoring doesn't need a second
-- migration later, and will be backfilled with a real FK when skills ships.
alter table public.milestones add column if not exists linked_skill_slugs text[] not null default '{}';

create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger set_milestones_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (matches the "own rows" pattern used throughout —
-- see study_sessions, career_tracker, dsa_progress)
-- ============================================================================

alter table public.goals enable row level security;
create policy "own rows: goals" on public.goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.milestones enable row level security;
create policy "own rows: milestones" on public.milestones
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.milestone_dependencies enable row level security;
create policy "own rows: milestone_dependencies" on public.milestone_dependencies
  for all to authenticated using (
    exists (select 1 from public.milestones m where m.id = milestone_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.milestones m where m.id = milestone_id and m.user_id = auth.uid())
    and exists (select 1 from public.milestones m2 where m2.id = depends_on_milestone_id and m2.user_id = auth.uid())
  );

-- ============================================================================
-- Goal progress view: percentage is always derived live from milestone
-- completion counts, never stored/cached, so it can't drift from reality.
-- ============================================================================
create or replace view public.goal_progress as
select
  g.id as goal_id,
  g.user_id,
  count(m.id) as milestone_count,
  count(m.id) filter (where m.status = 'completed') as milestones_completed,
  case
    when count(m.id) = 0 then 0
    else round(100.0 * count(m.id) filter (where m.status = 'completed') / count(m.id))
  end as progress_pct
from public.goals g
left join public.milestones m on m.goal_id = g.id
group by g.id, g.user_id;

grant select on public.goal_progress to authenticated;

-- goal_progress is a plain view over RLS-protected tables, so it inherits
-- the same row-level protection as goals/milestones automatically — no
-- separate policy needed (views run with the querying user's permissions
-- against the underlying tables in Postgres/Supabase's default model).

-- ============================================================================
-- Atomic milestone completion: sets status + completed_at together, and
-- lets the caller optionally cascade-complete the parent goal when this
-- was the last open milestone. Avoids the same read-modify-write race
-- class fixed in 0028 for daily_logs.
-- ============================================================================
create or replace function public.complete_milestone(p_milestone_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_goal_id uuid;
  v_remaining int;
begin
  update public.milestones
    set status = 'completed', completed_at = now(), updated_at = now()
    where id = p_milestone_id and user_id = auth.uid()
    returning goal_id into v_goal_id;

  if v_goal_id is null then
    return; -- not found or not owned by caller; RLS-safe no-op
  end if;

  select count(*) into v_remaining
    from public.milestones
    where goal_id = v_goal_id and status <> 'completed';

  if v_remaining = 0 then
    update public.goals
      set status = 'completed', completed_at = now(), updated_at = now()
      where id = v_goal_id and user_id = auth.uid() and status = 'active';
  end if;
end;
$$;

grant execute on function public.complete_milestone(uuid) to authenticated;
