-- ============================================================================
-- Real evidence link on topic completion (Feature 3: GitHub commit
-- evidence tied to topics). A genuine commit-to-topic cross-reference
-- would require an authenticated GitHub App/PAT parsing commit messages
-- or diffs against topic slugs — a much larger scope than this pass, and
-- the unauthenticated public Events API already used elsewhere
-- (github-activity.ts) doesn't expose enough detail to do that honestly.
--
-- Instead: an optional user-supplied evidence_url per topic (commit, PR,
-- or repo link), following the exact same pattern as
-- stage_projects.github_url. Not inferred, not auto-matched — the user
-- attaches the real link themselves when they complete a topic that
-- involved writing code.
-- ============================================================================

alter table public.topic_progress
  add column if not exists evidence_url text;

comment on column public.topic_progress.evidence_url is
  'Optional link (commit, PR, or repo) the user attaches as proof of work for this topic. User-entered only — never auto-matched from GitHub activity, since the public Events API this app uses elsewhere does not carry enough detail (commit messages, diffs) to do that honestly.';
