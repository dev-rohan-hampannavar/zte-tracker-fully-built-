# Test report

Verification was run from the extracted project on Windows (2026-08-29).

| Check | Result | Notes |
| --- | --- | --- |
| `npm test` | PASS | Redirect-security, production contracts, and in-process smoke behavior checks pass (study events, completion guard, backup coverage, PWA isolation, BI/data role seed, job-description analyzer, stale welcome-copy guard, and public JSON health validation). |
| `npx tsc --noEmit` | PASS | TypeScript completed with no diagnostics. |
| `npm run lint` | PASS | Full ESLint completed with 0 errors and 0 warnings. |
| `npm audit --audit-level=high` | PASS | 0 known vulnerabilities. |
| `npm run test:smoke` | Source contract PASS; live deployment pending | The probe now requires `/api/health` to remain public JSON (`ok`/`degraded`) instead of accepting a login redirect. The current deployment predates that middleware fix, and direct shell fetches are blocked by the managed network proxy; rerun after deploying this package. |
| Mobile public-shell inspection | PASS with deployment drift noted | At a 390×844 viewport, `/login` and `/welcome` have no horizontal overflow, keyboard focus reaches the labelled email input, and the browser reported no warning/error logs. The currently deployed `/welcome` still renders legacy seeded copy; the source fallback and contract guard are fixed in this package and will take effect after Vercel deployment. |
| `npm run validate:curriculum` | PASS with warnings | Structural checks pass; 112 legacy estimate/title warnings are reported. Strict mode remains intentionally red until source reconciliation. |
| `npm run build` | PARTIAL | Next compiled successfully; the managed Windows sandbox rejected the subsequent worker `spawn` with `EPERM`. A standalone TypeScript check passes. |
| `npm run dev` | BLOCKED IN SANDBOX | Next's development worker is also blocked by the managed Windows `spawn EPERM` policy; use a normal local terminal or Vercel preview for runtime smoke testing. |
| `npm run verify:supabase` | NOT RUN | Read-only migration/relation gate is included, but this environment has no `SUPABASE_SERVICE_ROLE_KEY`; run it from a secure release shell or the optional CI job. |

The redirect checks are executable contract tests because importing TypeScript directly into the sandboxed Node runner is not available. Supabase integration/RLS tests for migrations 0051–0055, Playwright journeys, accessibility scans, performance budgets, canonical study-event assertions, and an authenticated backup round-trip require external services or tooling and remain explicitly unverified.
