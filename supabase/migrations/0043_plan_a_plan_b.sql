-- ============================================================================
-- Plan A / Plan B career fork (Section 14 of the Zero to Elite integration).
--
-- target_roles (0033) currently only seeds SDE-track roles (frontend,
-- backend, fullstack, sde-1) — there is no Operations/Analyst role
-- anywhere in the schema, so a "Plan A health" view would have had
-- nothing real behind it. This migration adds the one role Plan A
-- actually needs, and a `career_plan` tag on career_tracker so real
-- applications can be attributed to Plan A or Plan B. No score, no
-- fabricated "Plan A readiness %" — the "no fake analytics" rule applies
-- here as much as anywhere else in this build: Plan A health is just the
-- real application_metrics numbers filtered by this tag, same view,
-- same computation, no parallel scoring system invented for it.
--
-- Defaults to 'plan_b' (SDE) for both new and existing rows: every
-- application already logged in this app was made in service of the SDE
-- transition, so backfilling them as Plan B is accurate, not a guess.
-- ============================================================================

alter table public.career_tracker
  add column if not exists career_plan text not null default 'plan_b' check (career_plan in ('plan_a', 'plan_b'));

comment on column public.career_tracker.career_plan is
  'Which fork of the Zero to Elite plan this application belongs to: plan_a (Operations/Analyst fallback) or plan_b (SDE transition, the default). Set by the user per application — never inferred from role/company text, since that would be a guess dressed up as data.';

create index if not exists idx_career_tracker_plan on public.career_tracker(user_id, career_plan);

insert into public.target_roles (id, name, description) values
  ('operations-analyst', 'Operations / Business Analyst', 'Plan A fallback — the financial/stability career track if the SDE transition (Plan B) does not clear the Month-24 evidence bar')
on conflict (id) do nothing;

-- Plan-level application metrics: same shape and same underlying query as
-- application_metrics (0031), just grouped by career_plan too, so Plan A
-- and Plan B health are read from one view with zero duplicated logic.
create or replace view public.application_metrics_by_plan as
select
  user_id,
  career_plan,
  count(*) as total_applications,
  count(*) filter (where application_status in ('applied', 'screening', 'interviewing')) as active_applications,
  count(*) filter (where application_status not in ('wishlist', 'applied')) as responded_applications,
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
  end as offer_rate_pct
from public.career_tracker
group by user_id, career_plan;

grant select on public.application_metrics_by_plan to authenticated;
