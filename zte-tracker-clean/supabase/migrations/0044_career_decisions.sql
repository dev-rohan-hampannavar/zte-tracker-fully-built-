-- ============================================================================
-- Persists each time the user explicitly acknowledges the Month-24 evidence
-- check (see assessMonth24Decision in plan-position.ts) and what they chose
-- to do about it. Without this, "endless Plan B" — repeatedly deferring
-- the decision without ever acting on the evidence — is undetectable,
-- because the assessment itself is recomputed live and never stored.
--
-- This is intentionally a log, not a single mutable "current decision"
-- field: the failure mode being detected IS the pattern across multiple
-- entries over time, so the history has to be real rows, not overwritten
-- state.
-- ============================================================================

create table if not exists public.career_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('go', 'no-go', 'insufficient-evidence')),
  -- What the user actually chose to do when shown this assessment.
  -- 'deferred' means they saw a go/no-go-worthy assessment and chose to
  -- keep going without changing plan — the raw material for detecting
  -- repeated deferral.
  action_taken text not null check (action_taken in ('accepted_go', 'accepted_no_go', 'deferred')),
  snapshot jsonb not null, -- the Month24Assessment.inputs at time of decision, for audit/context
  created_at timestamptz not null default now()
);

alter table public.career_decisions enable row level security;

create policy "own rows: career_decisions" on public.career_decisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_career_decisions_user_date on public.career_decisions(user_id, created_at desc);
