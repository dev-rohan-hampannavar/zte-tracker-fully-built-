# Career Strategy integration

The Career Strategy page turns the supplied Zero to Elite playbook into a native, authenticated ZTE Tracker surface.

## What is connected

- `src/data/full-plan.ts` holds the plan narrative and static reference content.
- `src/lib/career-plan.ts` derives the current month, deadline, roadmap completion, current phase, and exit readiness from live rows.
- `src/lib/hooks/use-career-plan.ts` persists the user-selected fork, dates, weekly target, and flagship project.
- `src/app/(app)/career-plan/page.tsx` composes the plan with existing roadmap, daily logs, study sessions, DSA, projects, applications, interview weaknesses, and Month-24 evidence logic.
- Sidebar and Dashboard provide entry points; the existing visual system remains the presentation layer.
- `/execution` adds the Execution OS for weekly commitments, time blocks, and evidence capture; `/career-plan` includes financial runway and application follow-up views.
- `/execution` can export the visible week as a local-time `.ics` file for Google Calendar, Outlook, or Apple Calendar without requiring OAuth credentials.
- Settings JSON backup/import now includes the full Execution OS history (commitments, time blocks, evidence) and the financial runway profile; imported evidence URLs are revalidated before restore.
- The canonical progress-reset RPC clears planning/evidence/study-event artifacts while preserving financial profile settings (`0053_execution_os_reset.sql`, extended by `0054_study_events_and_completion.sql`).
- Manual logs, focus sessions, and daily-plan completions now feed the canonical `study_events` ledger through server-side transactions; legacy `daily_logs`/`study_sessions` remain compatibility projections.
- Job Readiness includes a local, explainable job-description analyzer. It detects only technologies already in the canonical catalog and shows covered skills versus evidence gaps using the existing `skill_evidence` view.

## Release steps

1. Apply `supabase/migrations/0051_career_plan_settings.sql` through `supabase/migrations/0055_bi_data_readiness.sql` to the same Supabase project used by Vercel.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a secure shell/CI secret store and run `npm run verify:supabase`. This performs read-only PostgREST probes for the new tables and columns without exposing row data.
3. Start the app locally, sign in, open `/career-plan`, save each setting, reload, and confirm persistence.
4. Verify the current phase/exit labels against the rows returned by `phases` and `exit_ladder`.
5. Run the repository checks from `docs/test-report.md` and perform mobile/accessibility smoke testing.
6. Commit and push the source to the connected branch so Vercel deploys it. The local source package does not change the live domain by itself.

If migrations 0051–0054 are not present, the pages still render safe defaults where possible, but saving new fields or recording canonical events will return an actionable error rather than silently losing the user's choices.
