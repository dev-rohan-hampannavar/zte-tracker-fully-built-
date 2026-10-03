-- ============================================================================
-- PHASE 3 of the Career OS build: Job Application CRM.
--
-- career_tracker already exists (0001_init.sql) with the core pipeline
-- (wishlist -> applied -> screening -> interviewing -> offer/rejected/
-- withdrawn) plus company/role/interview_date/offer/resume_version/notes.
-- Per the "extend, don't duplicate" rule this stays THE application table;
-- this migration only adds the fields the spec calls for that are
-- genuinely missing (job URL, location, salary, JD, tech stack, recruiter,
-- follow-up date, rejection reason) and fixes the one real structural gap:
-- a single application can have MULTIPLE interview rounds (OA, recruiter
-- screen, technical, HR) but career_tracker only ever had one
-- interview_date column. interview_rounds below is new and additive; the
-- old interview_date column is left in place (not dropped) since existing
-- rows/reads depend on it, but new interview scheduling should go through
-- interview_rounds so multiple rounds per application are representable.
-- ============================================================================

alter table public.career_tracker add column if not exists job_url text;
alter table public.career_tracker add column if not exists location text;
alter table public.career_tracker add column if not exists salary_range text;
alter table public.career_tracker add column if not exists job_description text;
alter table public.career_tracker add column if not exists tech_stack text[] not null default '{}';
alter table public.career_tracker add column if not exists recruiter_name text;
alter table public.career_tracker add column if not exists recruiter_contact text;
alter table public.career_tracker add column if not exists follow_up_date date;
alter table public.career_tracker add column if not exists rejection_reason text;
alter table public.career_tracker add column if not exists source text; -- e.g. "referral", "LinkedIn", "cold apply"

create table if not exists public.interview_rounds (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references public.career_tracker(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  round_type text not null check (round_type in ('oa', 'recruiter_screen', 'technical', 'system_design', 'behavioral', 'hr', 'final', 'other')),
  scheduled_at timestamptz,
  completed boolean not null default false,
  result text check (result in ('pending', 'passed', 'failed', 'cancelled')) default 'pending',
  notes text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_interview_rounds_application on public.interview_rounds(application_id, order_index);
create index if not exists idx_interview_rounds_user_scheduled on public.interview_rounds(user_id, scheduled_at) where scheduled_at is not null;

create trigger set_interview_rounds_updated_at
  before update on public.interview_rounds
  for each row execute function public.set_updated_at();

alter table public.interview_rounds enable row level security;
create policy "own rows: interview_rounds" on public.interview_rounds
  for all to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (select 1 from public.career_tracker c where c.id = application_id and c.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Pipeline metrics view: total/active/response/interview/offer/rejection
-- rates, computed live from career_tracker rows (never a stored/cached
-- percentage — see the "no fake analytics" rule). One row per user.
-- ----------------------------------------------------------------------------
create or replace view public.application_metrics as
select
  user_id,
  count(*) as total_applications,
  count(*) filter (where application_status in ('applied', 'screening', 'interviewing')) as active_applications,
  count(*) filter (where application_status not in ('wishlist', 'applied')) as responded_applications,
  count(*) filter (where application_status in ('screening', 'interviewing', 'offer', 'rejected') and application_status <> 'applied') as past_applied_count,
  count(*) filter (where application_status = 'interviewing' or application_status = 'offer') as reached_interview_count,
  count(*) filter (where offer = true) as offer_count,
  count(*) filter (where application_status = 'rejected') as rejected_count,
  case when count(*) filter (where application_status <> 'wishlist') = 0 then 0
    else round(100.0 * count(*) filter (where application_status not in ('wishlist', 'applied')) / count(*) filter (where application_status <> 'wishlist'))
  end as response_rate_pct,
  case when count(*) filter (where application_status <> 'wishlist') = 0 then 0
    else round(100.0 * count(*) filter (where application_status in ('interviewing', 'offer')) / count(*) filter (where application_status <> 'wishlist'))
  end as interview_rate_pct,
  case when count(*) filter (where application_status <> 'wishlist') = 0 then 0
    else round(100.0 * count(*) filter (where offer = true) / count(*) filter (where application_status <> 'wishlist'))
  end as offer_rate_pct,
  case when count(*) filter (where application_status <> 'wishlist') = 0 then 0
    else round(100.0 * count(*) filter (where application_status = 'rejected') / count(*) filter (where application_status <> 'wishlist'))
  end as rejection_rate_pct
from public.career_tracker
group by user_id;

grant select on public.application_metrics to authenticated;

-- ============================================================================
-- Fix reset_user_progress(): tables added in Phases 1-3 of this build
-- (goals, milestones, study_sessions role in resets was already implicit
-- via daily_logs but the session-level detail wasn't wiped, focus_sessions,
-- interview_rounds) are per-user progress/application data that "Reset
-- progress" should clear but the function defined in 0024 doesn't know
-- about yet. Same create-or-replace-is-safe-either-way approach as 0024.
--
-- goals/milestones are deliberately included: they're the user's own
-- authored plan, same category as topic_notes or career_tracker, not
-- config like user_settings.
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
  -- interview_rounds cascades via career_tracker's FK (on delete cascade),
  -- but deleted explicitly too in case an application row somehow survives
  -- while its rounds should still be cleared (defensive, not load-bearing).
  delete from public.interview_rounds where user_id = auth.uid();
end;
$$;

grant execute on function public.reset_user_progress() to authenticated;
