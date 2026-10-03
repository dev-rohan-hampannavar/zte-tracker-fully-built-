-- Widen the career plan fork from a binary Plan A / Plan B choice into a
-- multi-track selector. The original constraint only allowed 'plan_a' and
-- 'plan_b'; this adds the SAP consulting, BA-to-PM, and Ops/Supply Chain
-- tracks introduced alongside the Career Strategy path explorer. Existing
-- rows already satisfy the new constraint (plan_a/plan_b are still valid
-- members), so no backfill is required.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_settings_career_plan_track_check') then
    alter table public.user_settings
      drop constraint user_settings_career_plan_track_check;
  end if;

  alter table public.user_settings
    add constraint user_settings_career_plan_track_check
    check (career_plan_track in ('plan_a', 'plan_b', 'sap', 'ba_pm', 'ops'));
end $$;

comment on column public.user_settings.career_plan_track is
  'User-selected track in the Career Strategy explorer: plan_a (Operations climb), plan_b (SDE sprint / ZTE full-stack), sap (SAP consultant), ba_pm (BA to Product Manager), or ops (Ops / Supply Chain).';
