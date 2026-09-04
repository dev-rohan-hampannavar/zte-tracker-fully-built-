-- ============================================================================
-- PHASE 3 of the requested "Engineering Career Operating System" expansion:
-- DSA + Revision Intelligence — evidence-based spaced review.
--
-- What already existed: a real, working fixed-interval spaced-repetition
-- schedule (src/lib/revision-schedule.ts) — 1/3/7-day gaps after
-- completion, 3 reviews to mastery, matching the roadmap's own
-- needs_revision/comfortable/mastered tiers. This is a legitimate,
-- Anki-style approach and is NOT being replaced.
--
-- What was missing, per the spec: "After revision ask for retention/
-- confidence (1 Forgot .. 5 Mastered). Use this to determine the next
-- review date." The existing schedule advances on a blind "mark
-- reviewed" click regardless of how well the topic was actually
-- recalled — two topics reviewed today with wildly different retention
-- get the exact same next-due date. This migration adds the confidence
-- signal as data; the adjustment logic itself lives in
-- src/lib/revision-schedule.ts (application code), not SQL.
-- ============================================================================

-- The most recent rating is genuinely useful to show inline (e.g. "last
-- felt: Weak") without a join, so it's kept on topic_progress itself —
-- exactly the same pattern already used for last_reviewed/review_count on
-- this table.
alter table public.topic_progress
  add column if not exists last_confidence_rating smallint check (last_confidence_rating between 1 and 5);

comment on column public.topic_progress.last_confidence_rating is
  'Retention/confidence rating (1=Forgot .. 5=Mastered) given at the most recent revision review. Drives the next review interval in application code (see src/lib/revision-schedule.ts) — a low rating shortens the next gap and can push the topic back a tier; a high rating can accelerate toward mastery.';

-- Full history of ratings, not just the latest — needed for the "weakest
-- topics" / "what am I actually forgetting" analytics the spec asks for
-- elsewhere (Phase 3's "weakest patterns" language, applied here to
-- revision rather than just DSA). One row per review action.
create table if not exists public.revision_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.topics(id) on delete cascade,
  confidence_rating smallint not null check (confidence_rating between 1 and 5),
  reviewed_at timestamptz not null default now(),
  -- Snapshot of the tier this review moved the topic INTO, so history
  -- reads correctly even if the tier system's definition ever changes.
  resulting_tier text not null
);

create index if not exists idx_revision_history_user_topic
  on public.revision_history(user_id, topic_id, reviewed_at desc);

-- For "weakest topics" queries: fast lookup of a user's lowest recent
-- ratings without scanning their whole history.
create index if not exists idx_revision_history_user_rating
  on public.revision_history(user_id, confidence_rating);

alter table public.revision_history enable row level security;

create policy "own rows: revision_history" on public.revision_history
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
