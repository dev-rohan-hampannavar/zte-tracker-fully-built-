# Migration report

This hardening pass adds migrations `0047` through `0055`. They are append-only and preserve existing rows; no destructive data migration was run against a live database. Migrations `0051`–`0055` add Career Strategy settings, Execution OS tables, reset coverage, the canonical study-event ledger, server-authorized topic completion, and BI/data readiness.

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

## Rollout and rollback

Apply migrations in numeric order on a disposable/staging Supabase project first. Because the changes replace functions/policies and add constraints, rollback should be performed by a reviewed inverse migration or database restore; do not manually edit production rows. The `NOT VALID` URL checks are deliberately reversible with `ALTER TABLE ... DROP CONSTRAINT` if an operator must pause rollout.

Live Supabase execution, cross-user RLS tests, and backup/restore round-trip verification remain deployment acceptance work and are not claimed by this repository-only pass.
