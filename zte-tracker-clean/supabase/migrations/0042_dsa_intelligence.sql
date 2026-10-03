-- ============================================================================
-- Phase 3 of the "Engineering Career Operating System" expansion:
-- DSA Intelligence.
--
-- dsa_progress (0001_init.sql) is currently a checklist: problem_name,
-- difficulty, topic_tag, completed, notes. The spec asks for real
-- evidence per attempt — attempts count, time taken, hints used, whether
-- the solution was viewed, mistakes made, a confidence rating, and a
-- revision status — so the app can recommend what to practice next and
-- report real accuracy/weak-pattern analytics instead of the
-- completion-rate proxy the DSA page's "weak areas" section currently
-- has to fall back to (its own comment explicitly says fabricating
-- accuracy would misrepresent data that doesn't exist — this migration
-- is what makes that data exist).
--
-- Additive only, following the same pattern as 0041_revision_confidence
-- and 0005_revision_tiers: existing rows get sensible defaults
-- (attempts=1 for anything already logged, everything else null/false),
-- nothing is renamed or dropped, and `completed`/`completed_at` keep
-- meaning exactly what they already mean.
-- ============================================================================

alter table public.dsa_progress
  add column if not exists pattern text, -- e.g. "two-pointers", "sliding-window" — distinct from topic_tag, which the existing UI already uses as a free-text label; pattern is specifically the algorithmic technique, so a problem can carry both a broad topic_tag ("Arrays") and a specific pattern ("two-pointers") without overloading one field to mean both
  add column if not exists attempts int not null default 1 check (attempts >= 0),
  add column if not exists time_taken_minutes int check (time_taken_minutes >= 0),
  add column if not exists hints_used int not null default 0 check (hints_used >= 0),
  add column if not exists solution_viewed boolean not null default false,
  add column if not exists mistakes text, -- free text: what went wrong, in the person's own words — not a fixed taxonomy, since wrong-answer categories vary too much by problem to enumerate meaningfully
  add column if not exists confidence smallint check (confidence between 1 and 5), -- same 1-5 scale as topic revision (1 Forgot .. 5 Mastered), so "how well do I actually know this" reads the same way across DSA and roadmap topics
  add column if not exists revision_status text check (revision_status in ('needs_revision', 'comfortable', 'mastered')), -- mirrors topic_progress.revision_status exactly (same three values) so DSA problems can feed the same due-for-review notion the roadmap already uses, rather than inventing a second vocabulary
  add column if not exists review_count int not null default 0,
  add column if not exists next_review_due timestamptz,
  add column if not exists last_reviewed_at timestamptz;

comment on column public.dsa_progress.review_count is
  'Mirrors topic_progress.review_count exactly — number of spaced-repetition reviews completed, driving the same 1/3/7-day tier schedule via the same revision-schedule.ts functions used for roadmap topics.';

comment on column public.dsa_progress.pattern is
  'The algorithmic technique/pattern (two-pointers, sliding-window, DP, etc.) — distinct from topic_tag, which the pre-existing UI already uses as a broader free-text label. Nullable: not every problem gets tagged with a specific pattern.';
comment on column public.dsa_progress.attempts is
  'How many times the person attempted this problem before solving it (or across attempts if still unsolved). Defaults to 1 for both new and pre-existing rows — every logged problem was attempted at least once.';
comment on column public.dsa_progress.confidence is
  'Post-solve confidence, 1 (Forgot / had to look up everything) to 5 (Mastered) — same scale as topic_progress.last_confidence_rating, set at review time via the same picker component.';
comment on column public.dsa_progress.revision_status is
  'Mirrors topic_progress.revision_status''s three values exactly, so DSA problems can be surfaced as due-for-review using the same vocabulary the roadmap revision system already uses.';
comment on column public.dsa_progress.next_review_due is
  'When this problem should be revisited, following the same fixed-interval schedule (1/3/7 days) as topic revision. Null if never solved or already mastered.';

create index if not exists idx_dsa_progress_pattern on public.dsa_progress(user_id, pattern) where pattern is not null;
create index if not exists idx_dsa_progress_review_due on public.dsa_progress(user_id, next_review_due) where next_review_due is not null;
