-- Persist the personal career-playbook choices alongside the existing
-- user settings row. These values are user-owned preferences, not a second
-- source of roadmap truth: progress and readiness remain derived from the
-- existing progress tables and views.
alter table public.user_settings
  add column if not exists career_plan_version text not null default '2026-08-canonical',
  add column if not exists career_plan_track text not null default 'plan_b',
  add column if not exists career_plan_start_date date,
  add column if not exists career_plan_deadline_date date,
  add column if not exists career_plan_weekly_hours numeric(5,1) not null default 40,
  add column if not exists career_plan_flagship_project text not null default 'ClientSync';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_settings_career_plan_track_check') then
    alter table public.user_settings
      add constraint user_settings_career_plan_track_check
      check (career_plan_track in ('plan_a', 'plan_b'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_career_plan_weekly_hours_check') then
    alter table public.user_settings
      add constraint user_settings_career_plan_weekly_hours_check
      check (career_plan_weekly_hours between 1 and 168);
  end if;
end $$;

comment on column public.user_settings.career_plan_track is 'User-selected fork in the Zero to Elite 24-month operating plan.';
comment on column public.user_settings.career_plan_weekly_hours is 'Personal weekly target; actual hours remain derived from daily_logs.';
