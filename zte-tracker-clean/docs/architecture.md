# ZTE Tracker architecture

## Runtime boundaries

- Next.js App Router renders authenticated routes under `src/app/(app)` and public profile/API routes under `src/app/u` and `src/app/api/public`.
- Browser data access uses the Supabase SSR browser client through SWR hooks in `src/lib/hooks`.
- Middleware protects authenticated routes, refreshes sessions, and emits a request-scoped CSP nonce.
- Public profile responses use the server admin client with explicit public projections; private tables are never opened to anonymous reads.

## Core data flows

| Flow | UI | Server boundary | Durable state | Derived consumers |
| --- | --- | --- | --- | --- |
| Study activity | Daily Mission / focus timer / daily plan | `record_study_session`, `complete_focus_session`, `record_study_activity` | `study_events` + compatibility `study_sessions`/`daily_logs` | streaks, weekly metrics, plan adherence |
| Topic completion | Roadmap topic control | `set_topic_completion` RPC + completion trigger | `topic_progress`, `activity_log` | roadmap, revision, public phase stats |
| Daily plan | `/daily-plan` | `complete_daily_plan_task` RPC | `daily_plan_task_state` | weekly review, carry-forward |
| Execution OS | `/execution` | RLS-protected table mutations | commitments, time blocks, evidence, financial profile | `/career-plan`, calendar export |
| Career funnel | `/career`, `/interviews`, `/resume` | RLS-protected CRM tables | applications, rounds, attempts, skills | role readiness and follow-up queue |
| Backup/reset | Settings | scoped Supabase writes / `reset_user_progress` | all user-owned state | JSON restore, progress reset |

## Schema and policies

The numbered migrations are append-only and applied in order. User-owned tables use `auth.uid() = user_id` RLS policies. The latest feature migrations are:

- `0051_career_plan_settings.sql` — plan fork, dates, weekly target, flagship project.
- `0052_execution_os.sql` — commitments, time blocks, evidence, financial runway.
- `0053_execution_os_reset.sql` — reset coverage for Execution OS progress.
- `0054_study_events_and_completion.sql` — canonical event ledger, atomic recording RPCs, completion authorization/guard, and final reset coverage.
- `0055_bi_data_readiness.sql` — BI/data role plus data-tool technology catalog entries.

## External integrations

GitHub public activity is credentialless. Calendar export is a local `.ics` file. Google/Outlook OAuth, Sentry, AI, and job-board APIs remain opt-in configuration boundaries documented in [`integrations.md`](integrations.md); no credentials are bundled.
