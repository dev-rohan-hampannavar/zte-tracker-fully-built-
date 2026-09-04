# Optional integrations and credential boundaries

The suite includes credentialless integrations where they are safe to ship now, and keeps external OAuth/API work behind explicit configuration.

- **GitHub:** the existing public-activity route reads the authenticated user's saved GitHub username; it does not accept arbitrary usernames from the browser.
- **Calendar:** `/execution` exports the selected week as a local-time `.ics` file, importable by Google Calendar, Outlook, or Apple Calendar without OAuth.
- **Vercel monitoring:** `/api/health` reports app/database dependency status without exposing environment values. Pair it with a Vercel uptime check.
- **Google/Outlook calendar OAuth:** not enabled in this package. It requires an OAuth app, redirect URIs, scopes, and user consent; add those credentials before implementing two-way sync.
- **Sentry or another error vendor:** not enabled. Configure an approved DSN and retention policy before adding client error telemetry; until then, use the route error boundary plus Vercel runtime logs.
- **AI coach / job-board ingestion / voice practice:** intentionally not enabled without a provider, privacy decision, and budget. The current product exposes the underlying evidence and readiness data so these can be added later without duplicating business logic.
