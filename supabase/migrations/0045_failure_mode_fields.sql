-- ============================================================================
-- Adds the two real fields needed to honestly detect the remaining failure
-- modes from Section 16 (tutorial dependency, ignoring day job). Both are
-- user-entered, optional, and default to values that make them opt-in:
-- a session not tagged either way is simply not counted toward the
-- tutorial-dependency signal, and a day with no day_job_hours logged is
-- simply excluded from the ignoring-day-job signal, rather than assumed
-- to be zero. No inference, no fabricated defaults.
-- ============================================================================

alter table public.study_sessions
  add column if not exists is_tutorial boolean;

comment on column public.study_sessions.is_tutorial is
  'Whether this session was following a tutorial/course vs. independent building. Null = not specified (excluded from tutorial-dependency detection, never assumed either way). User-set only.';

alter table public.daily_logs
  add column if not exists day_job_hours numeric(4,1);

comment on column public.daily_logs.day_job_hours is
  'Hours spent on the day job that day, if the user chooses to log it. Null = not logged (excluded from ignoring-day-job detection). Optional and never required, since not everyone wants to track this.';
