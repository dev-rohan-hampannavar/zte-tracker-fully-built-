-- ============================================================================
-- PHASE 6 — Personalized onboarding: storage for onboarding answers
--
-- Purpose: give the onboarding flow (Phase 6 UI, built alongside this
-- migration) somewhere to persist a user's answers, and give the
-- personalization engine (Phase 7) a single row per user to read from
-- when assigning a roadmap.
--
-- Deliberately a NEW table rather than reusing user_skills / dsa_progress
-- / interview-prep tables: those are ongoing evidence-tracking systems
-- (a list of skills with notes, a list of DSA problems attempted) with a
-- different shape and purpose than a one-time coarse self-assessment
-- ("DSA level: beginner") taken at signup. Onboarding answers get their
-- own table so the personalization engine has one unambiguous row to
-- read per user, instead of having to reconstruct "what did they say at
-- signup" by querying tables that have since been added to/changed by
-- normal app usage.
--
-- Scope kept intentionally short, per the master prompt's own Phase 6
-- instruction ("do not create an unnecessarily long questionnaire... ask
-- only questions that materially affect the roadmap"): goal, target
-- role, experience level, existing skills (free text list — technology_id
-- matching against the `technologies` table is a Phase 7 concern, not a
-- storage concern), weekly hours, target date, DSA level, interview
-- readiness, career situation. Existing-projects detail is intentionally
-- left as a text field rather than structured rows — turning "tell us
-- about a project you've built" into first-class project rows is Phase
-- 12's job, not onboarding's.
-- ============================================================================

create table if not exists public.onboarding_responses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text check (goal in (
    'first_job', 'get_better', 'interview_prep', 'build_projects',
    'career_switch', 'upskill', 'other'
  )),
  goal_other text,
  target_role_id text references public.target_roles(id),
  experience_level text check (experience_level in ('beginner', 'foundation', 'intermediate', 'advanced')),
  existing_skills text[],
  weekly_hours numeric,
  target_date date,
  existing_projects_note text,
  dsa_level text check (dsa_level in ('none', 'beginner', 'intermediate', 'advanced')),
  interview_readiness text check (interview_readiness in ('none', 'beginner', 'some_experience', 'strong')),
  career_situation text check (career_situation in (
    'student', 'recent_graduate', 'career_switcher', 'working_developer', 'experienced_professional'
  )),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.onboarding_responses is
  'One row per user: their answers from the Phase 6 onboarding flow. '
  'completed_at is null while onboarding is in progress (lets the UI '
  'resume a partially-filled flow) and set once submitted — Phase 7''s '
  'personalization engine should only act on rows where completed_at is '
  'not null. This is a point-in-time snapshot of what the user said at '
  'signup, not a synced/live preference — see user_skills and '
  'career_tracker for the ongoing, evidence-based versions of "what '
  'skills/goals does this user actually have now".';

alter table public.onboarding_responses enable row level security;

create policy "onboarding_responses_select_own" on public.onboarding_responses
  for select using (auth.uid() = user_id);
create policy "onboarding_responses_insert_own" on public.onboarding_responses
  for insert with check (auth.uid() = user_id);
create policy "onboarding_responses_update_own" on public.onboarding_responses
  for update using (auth.uid() = user_id);

-- No delete policy: onboarding answers are a signup-time record, not
-- something a user needs to delete independently of their account
-- (account deletion, Phase 42, cascades via the on delete cascade
-- foreign key above — this table doesn't need its own delete path).

create or replace function public.touch_onboarding_responses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_onboarding_responses on public.onboarding_responses;
create trigger touch_onboarding_responses
  before update on public.onboarding_responses
  for each row
  execute function public.touch_onboarding_responses_updated_at();

-- Sync user_settings.onboarding_completed / onboarding_completed_at
-- (added in migration 0069) when a response row's completed_at is set,
-- for the same reason 0071 syncs user_settings.roadmap_id: one place
-- writes the fact, a trigger propagates it, instead of trusting every
-- future call site to update both tables.
create or replace function public.sync_onboarding_completion_to_user_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- TG_OP distinguishes insert from update explicitly rather than
  -- relying on OLD (which this migration's author could not verify
  -- against a live Postgres instance while writing it — TG_OP is
  -- documented, unambiguous behavior, so it's used here instead of a
  -- comparison against OLD that depends on exactly how NEW/OLD behave
  -- for a fresh INSERT row).
  if new.completed_at is not null then
    if TG_OP = 'INSERT' or old.completed_at is null or old.completed_at <> new.completed_at then
      update public.user_settings
      set onboarding_completed = true,
          onboarding_completed_at = new.completed_at
      where user_id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_onboarding_completion on public.onboarding_responses;
create trigger sync_onboarding_completion
  after insert or update of completed_at on public.onboarding_responses
  for each row
  execute function public.sync_onboarding_completion_to_user_settings();
