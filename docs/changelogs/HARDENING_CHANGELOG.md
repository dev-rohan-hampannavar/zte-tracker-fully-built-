# ZTE hardening pass

This pass implements the highest-risk corrections from the supplied execution specification. The specification is treated as acceptance criteria; it does not override repository or user instructions.

## Security

- Added `safeRedirectPath()` and applied it to the auth callback, login magic-link URL, and OTP navigation. It rejects external, protocol-relative, encoded/double-encoded, backslash, and non-HTTP redirect forms.
- Removed direct public RLS policies from private profile/progress tables. Public HTML, JSON, and OpenGraph surfaces now cross a server-only explicit-field projection using the admin client; the service key is never sent to the browser.
- Replaced `ensure_profile_slug(uid)` with an authenticated-user-bound `ensure_profile_slug()` RPC and revoked the old overload.
- Added request-scoped nonce CSP in the proxy; the root theme bootstrap script receives the nonce. Static `unsafe-inline` script CSP was removed.
- Service worker no longer caches HTML navigations, preventing cross-account offline data exposure. Static shell assets remain cacheable; offline mutations remain unsupported and visible as failures.
- Added database-level (NOT VALID) HTTP(S)-only constraints for user-entered links while preserving legacy rows for remediation.
- Added `rel="noopener noreferrer"` to audited external links.

## Data integrity

- Time logging no longer auto-completes topics when estimated time is reached. It records `actual_minutes_spent` only; explicit completion and validation remain separate.
- Added user timezone storage and timezone-aware focus-session calendar-date derivation.
- Marked user-specific aggregate views as `security_invoker`.
- Replaced the reset RPC with a dependency-safe canonical reset covering progress, plans, sessions, revision history, career decisions, activity, notifications, skills, and related user state while preserving identity/settings.
- Added `study_events` as a canonical activity ledger (migration 0054); manual logs, focus timers, and daily-plan completions write through server-side transactions while legacy roll-ups remain compatible.
- Added a server-authorized `set_topic_completion()` RPC and database trigger guard so authenticated clients cannot change completion state through direct table writes.
- Settings backup/import now includes all user-owned domains, revalidates evidence URLs, and restores Execution OS/financial data idempotently.

## Engineering

- Upgraded Next.js and `eslint-config-next` to 16.3.3.
- Added executable regression checks for redirect security, canonical migrations, backup coverage, and PWA isolation (`npm test`, `npm run test:unit`).
- Added `.github/workflows/ci.yml` for typecheck, lint, tests, curriculum validation, audit, build, and optional deployed smoke checks.
- Added URL normalization at mutation boundaries for project, advanced-project, DSA, resource, topic-evidence, career, and build-in-public links.
- Added `npm run validate:curriculum` structural checks with a strict mode for CI once legacy source warnings are reconciled.
- Fixed hook-order and render-mutation lint defects, and replaced internal `window.location` navigation with Next router navigation.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | PASS (redirect + production contract checks) |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| `npm audit --audit-level=high` | PASS (0 vulnerabilities) |
| `npm run validate:curriculum` | PASS (structural checks; 112 documented legacy warnings) |
| `npm run test:smoke` | PASS against `https://zerotoelite.site` (health, login, welcome, career-plan, execution) |
| `npm run build` | Compiles successfully, then the managed Windows sandbox rejects Next's worker `spawn` with `EPERM`; this is an execution-environment blocker, not a compiler error |

## Known remaining acceptance work

The supplied specification is a full product audit, not a small patch. A clean Supabase instance, authenticated multi-user integration tests, E2E/browser testing, accessibility tooling, performance measurement, backup round-trip fixtures, and curriculum/day/technology reconciliation still require deployment/test infrastructure and were not falsely marked complete here.

Supporting evidence: [`docs/migration-report.md`](docs/migration-report.md), [`docs/test-report.md`](docs/test-report.md), [`docs/data-integrity-report.md`](docs/data-integrity-report.md), and [`docs/production-readiness-report.md`](docs/production-readiness-report.md).
