-- Flips the meaning of plan_a/plan_b to match how the app is actually
-- used: ZTE full-stack (formerly "plan_b", and the default since 0051) is
-- the primary path a user builds their whole plan around, so it becomes
-- "plan_a". SAP, BA->PM, and Ops/Supply Chain (added in 0064) remain
-- their own distinct values — they are not merged into a single "plan_b"
-- bucket in user_settings.career_plan_track, since one settings row can't
-- represent three different careers' worth of stages and salary data.
--
-- user_settings.career_plan_track:
--   old plan_b (ZTE / SDE transition, the default since 0051) -> plan_a
--   old plan_a (Operations fallback, flat ladder)              -> ops
--     (the closest real equivalent, and the only one of the four new
--     tracks that covers operations career growth — with a full stage
--     ladder behind it, unlike the old flat plan_a entry it replaces)
--   sap / ba_pm / ops (0064)                                   -> unchanged
--
-- career_tracker.career_plan (a separate, independent column — see 0043):
--   old plan_a (Operations fallback) -> plan_b (now: "any alternative fork")
--   old plan_b (SDE transition)      -> plan_a (primary, unchanged meaning)
--
-- Both swaps go through a temporary sentinel value so an A->B, B->A pair
-- of UPDATEs can't have the second statement re-match rows the first one
-- just wrote.

-- ---------------------------------------------------------------------------
-- 1. user_settings.career_plan_track
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'user_settings_career_plan_track_check') then
    alter table public.user_settings
      drop constraint user_settings_career_plan_track_check;
  end if;
end $$;

update public.user_settings set career_plan_track = '__tmp_swap' where career_plan_track = 'plan_a';
update public.user_settings set career_plan_track = 'plan_a' where career_plan_track = 'plan_b';
update public.user_settings set career_plan_track = 'ops' where career_plan_track = '__tmp_swap';

alter table public.user_settings
  add constraint user_settings_career_plan_track_check
  check (career_plan_track in ('plan_a', 'sap', 'ba_pm', 'ops'));

alter table public.user_settings
  alter column career_plan_track set default 'plan_a';

comment on column public.user_settings.career_plan_track is
  'User-selected track in the Career Strategy explorer: plan_a (ZTE full-stack, the primary plan), sap (SAP consultant), ba_pm (BA to Product Manager), or ops (Ops / Supply Chain). plan_b no longer exists as a value here — it was renamed to plan_a when ZTE became the primary track; users previously on the old flat Operations plan_a were moved to the richer ops track.';

-- ---------------------------------------------------------------------------
-- 2. career_tracker.career_plan (per-application tag, independent column)
-- ---------------------------------------------------------------------------

alter table public.career_tracker
  drop constraint if exists career_tracker_career_plan_check;

update public.career_tracker set career_plan = '__tmp_swap' where career_plan = 'plan_a';
update public.career_tracker set career_plan = 'plan_a' where career_plan = 'plan_b';
update public.career_tracker set career_plan = 'plan_b' where career_plan = '__tmp_swap';

alter table public.career_tracker
  add constraint career_tracker_career_plan_check
  check (career_plan in ('plan_a', 'plan_b'));

alter table public.career_tracker
  alter column career_plan set default 'plan_a';

comment on column public.career_tracker.career_plan is
  'Which fork of the Zero to Elite plan this application belongs to: plan_a (ZTE / SDE transition, the primary plan and default) or plan_b (any alternative fork — SAP, BA->PM, or Ops/Supply Chain). Set by the user per application — never inferred from role/company text.';
