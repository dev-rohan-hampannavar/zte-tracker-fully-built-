# Migration report

The repository migration history is append-only. This report originally documented migrations `0047`–`0055`; the continuation now adds `0077`–`0085`. No migration in this work was applied to a live database because no Supabase credentials were provided.

## 0047 - security hardening

- Removes anonymous/public read policies from private progress/settings tables used by public profiles.
- Replaces the client-supplied `ensure_profile_slug(uuid)` overload with authenticated-user-bound `ensure_profile_slug()` using `auth.uid()`.
- Revokes public/anonymous execution and grants the new RPC only to `authenticated`.
- Public profile HTML, JSON, and OpenGraph code now uses a server-only admin projection with explicit selected fields.

## 0048 - URL integrity constraints

- Adds `NOT VALID` HTTP(S)-only checks to project, advanced-project, build-in-public, DSA, career, resource, and evidence URL columns.
- `NOT VALID` preserves historical rows while enforcing safe protocols for new and updated rows. Operators should remediate legacy values and run `VALIDATE CONSTRAINT` before marking the database fully clean.

## 0049 - view and timezone hardening

- Marks user-scoped aggregate views `security_invoker = true` so underlying RLS evaluates as the caller.
- Adds `user_settings.timezone` with a UTC default.
- Replaces `complete_focus_session` with an ownership-checked, timezone-aware, atomic implementation and limits execution to authenticated users.

## 0050 - complete progress reset

- Replaces `reset_user_progress()` with an authenticated, dependency-safe reset covering plans, learning progress, sessions, revision history, skills, goals/milestones, career/interview state, activity, notifications, and public summaries.
- Identity and `user_settings` are intentionally preserved.
- Execution is restricted to `authenticated`.

## 0077–0078 - admin protection and detailed tracks

- `0077` blocks a normal user from changing their own `is_admin` flag while preserving the existing administrator helper and policies.
- `0078` creates a separate, versioned detailed-curriculum schema and seeds role-family catalogs/assignments without rewriting the original phase/topic records.
- `scripts/generate-roadmap-tracks.mjs` produces `seed_roadmap_tracks.sql` from source curriculum and track JSON. The structure validator currently reports 3 tracks, 63 phases, 1,193 topics, and 614 applied projects.

## 0079–0083 - learning workflow and onboarding

- `0079` stores detailed-roadmap starting phase IDs separately from legacy `phases.id` values.
- `0080` adds topic prerequisites/resources, spaced-review metadata, and per-user detailed-project progress.
- `0081` extends progress reset to detailed topic/project progress and notes while preserving enrollment and onboarding choices.
- `0082` scopes detailed-curriculum reads to public tracks or the caller's active enrolled version, and grants admin writes for curriculum content.
- `0083` adds an authenticated security-definer transaction that validates role/roadmap/version ownership and commits onboarding answers plus active enrollment together.

## 0084 - curriculum release workflow

- Adds draft, review, test, and published version states with an admin audit trail.
- Adds an admin-only draft-copy RPC and a controlled status-transition RPC. Existing learners stay on their enrolled version; only published versions can be selected for new enrollment.
- Removes direct version writes and restricts phase/module/topic/project edits to drafts. The review transition checks that each phase, module, topic, project, prerequisite, and resource has the required structure before allowing release.

## 0085 - product funnel and feature switches

- Records only first funnel milestones (signup, onboarding, roadmap view, topic start/completion, project start/deploy) plus one return-use event per account per day. It does not store arbitrary page metadata or user-generated text.
- Authenticated users can read their own event rows; the admin report returns aggregate counts and date bounds only. Signup/onboarding and legacy topic start/completion events are recorded by database triggers.
- Adds admin-managed feature flags and a transactional admin RPC for role-to-roadmap assignments.
- Extends `verify:supabase` with read-only probes for these new tables and columns, and extends `verify:isolation` with product-event ownership/direct-write checks.

Migration order matters: apply all missing SQL migrations before `seed_roadmap_tracks.sql`. Run the seed against a staging database and preserve a database backup before upgrading any existing deployment.

## Rollout and rollback

Apply migrations in numeric order on a disposable/staging Supabase project first. Because the changes replace functions/policies and add constraints, rollback should be performed by a reviewed inverse migration or database restore; do not manually edit production rows. The `NOT VALID` URL checks are deliberately reversible with `ALTER TABLE ... DROP CONSTRAINT` if an operator must pause rollout.

Live Supabase execution, cross-user RLS tests, owner/new-user onboarding, and backup/restore round-trip verification remain deployment acceptance work and are not claimed by this repository-only pass. The new workflow has source-level checks, but must be applied and exercised against staging before the app is treated as released.
