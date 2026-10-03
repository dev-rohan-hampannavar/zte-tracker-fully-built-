# ZTE Tracker feature matrix

This is the honest release status for the prioritized feature list. “Implemented” means the source package contains the feature. “Verified” means it was exercised against the intended external service; those are separate gates.

## Must-have before production

| Feature | Source status | Release status |
| --- | --- | --- |
| Supabase migration verification and rollback | Rollback plan in `docs/migration-report.md`; read-only `npm run verify:supabase` gate now probes migrations 0077–0085 | Migrations 0077–0085 and the detailed-track seed have not been applied/verified against a live project |
| Automated database backups and restore testing | Settings JSON backup/import and reset coverage | Supabase platform backups and an authenticated restore round-trip are not verified |
| Error monitoring and uptime | Public `/api/health`, strict smoke checker, optional CI smoke job | External error monitor (for example Sentry) is not configured; live deployment status was not checked |
| End-to-end smoke journeys | In-process health/smoke contract tests | Authenticated login, progress, logging, applications, settings, export, and reset journeys still require a signed-in browser/session |
| Mobile/keyboard/accessibility/loading QA | Responsive/loading/error states; public 390×844 check passed | Full authenticated manual/accessibility pass remains pending |
| Clear onboarding | Welcome tour plus Career Plan setup for fork, dates, hours, and flagship project | Implemented in source |
| Vercel deployment health endpoint | Public source route and JSON contract | Must be deployed before the live domain can pass the strict probe |

## Roadmap platform status

Three detailed track families are generated from the existing 21-phase curriculum plus authored role-specific additions. They contain 63 phases, 1,193 topics, and 614 applied projects; all ten target roles currently seeded in the project map to one of these families. Enrollment-aware dashboard, roadmap, and daily-plan views save topic/project progress, surface prerequisites, and schedule suggested reviews. Final onboarding and enrollment are committed together by a database function. Admins can create drafts, add and edit phases/modules/topics/projects, update topic resources and prerequisites, map roles to tracks, and publish through a review/test workflow. Feature switches and aggregate funnel reporting are also available in admin.

The curriculum generator passes its structural checks. Human subject-matter review and live Supabase validation remain pending. Migration 0084 validates content structure before review and keeps published versions read-only. New migrations and generated seed SQL must be applied to the target Supabase project before these features work in a deployed app.

## Essential career-plan features

All of these are implemented in source: Execution OS time blocks with local `.ics` export, three weekly commitments and review variance, evidence vault, financial runway calculator, application follow-ups/interview preparation, Plan A/Plan B settings and decision history, and the 20/30/40/50-hour pace simulator.

## Good-to-have features

| Feature | Status |
| --- | --- |
| GitHub activity | Lightweight public-events activity view; no OAuth/full contribution sync |
| Role readiness | Three detailed roadmap families mapped to all ten target roles currently seeded; specialist depth differs by family |
| Resume evidence bullets | Implemented from real completed/evidence data |
| Timed interview simulator | Implemented and writes to shared interview history |
| Progress analytics | Implemented from live activity/application/readiness data |
| Mobile push notifications | Not implemented; requires VAPID/service-worker backend setup |
| Google/Outlook Calendar | Local `.ics` export implemented; two-way OAuth sync not implemented |
| Job-description analysis | Implemented using canonical catalog/evidence, without an opaque AI score |
| Custom dashboard widgets | Not implemented; existing dashboard widgets remain fixed/native |

## Intentionally deferred complexity

AI coach, multi-scenario simulator, voice practice, cohort mode, browser extension, Slack/Teams reminders, and automated job-board ingestion are not enabled. They require additional credentials, privacy decisions, or operational cost and are not prerequisites for the core tracker.
