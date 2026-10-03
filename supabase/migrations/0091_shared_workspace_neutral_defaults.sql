-- Shared-workspace accounts must not inherit any values that came from the
-- owner's private plan. The career-plan flagship project defaulted to the
-- owner's own project name for every new account (migration 0051). Give new
-- accounts a neutral default and clear the inherited value from existing
-- non-owner accounts. Owner rows (is_owner = true) are untouched, and rows
-- where a shared user typed their own project name are left alone.

alter table public.user_settings
  alter column career_plan_flagship_project set default 'My flagship project';

update public.user_settings
set career_plan_flagship_project = 'My flagship project'
where is_owner = false
  and career_plan_flagship_project = 'ClientSync';
