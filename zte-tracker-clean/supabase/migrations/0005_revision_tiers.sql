-- ============================================================================
-- ZTE Tracker — P7.4 item 16: Revision spaced-repetition tiers
-- Adds real tier tracking + overdue scheduling on top of the existing
-- revision_status field, which was a single static tag with no schedule
-- (set once, never advances, no notion of "due"). Additive only.
-- ============================================================================

alter table public.topic_progress
  add column if not exists review_count int not null default 0,
  add column if not exists next_review_due timestamptz;

comment on column public.topic_progress.review_count is
  'Number of spaced-repetition reviews completed for this topic (0 = never reviewed since completion, caps effectively at 3: 1st/2nd/3rd, after which the topic is mastered and no longer scheduled).';
comment on column public.topic_progress.next_review_due is
  'When this topic''s next spaced-repetition review is due. Null once mastered (review_count reaches the mastery threshold) or if the topic has never been completed. Computed client-side using a fixed interval schedule (1 / 3 / 7 / 21 days) and written back on each review — not recomputed from a cron job, since the schedule only needs to change when the user actually reviews.';
