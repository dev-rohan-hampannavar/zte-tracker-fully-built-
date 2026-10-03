-- ============================================================================
-- ZTE Tracker — P7.5 item 17: Learning journal
-- Adds structured reflection fields to daily_logs (one row per user per
-- date already exists for hours/note — the journal is the same daily unit,
-- not a separate entity). Additive only.
-- ============================================================================

alter table public.daily_logs
  add column if not exists learned text,
  add column if not exists mistakes text,
  add column if not exists wins text,
  add column if not exists tomorrow_goal text;

comment on column public.daily_logs.learned is 'What was learned today — free text, optional.';
comment on column public.daily_logs.mistakes is 'Mistakes or sticking points from today — free text, optional.';
comment on column public.daily_logs.wins is 'Wins or things that went well today — free text, optional.';
comment on column public.daily_logs.tomorrow_goal is 'What to tackle tomorrow — free text, optional.';
