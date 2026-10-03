# Data-integrity report

## Implemented safeguards

- Study-time logging updates `actual_minutes_spent` only; estimates never set completion.
- Focus-session completion checks ownership, clamps negative elapsed time, derives the calendar date from the persisted IANA timezone, and writes the session/daily total atomically.
- URL constraints enforce HTTP(S) for new and updated user links while preserving legacy rows for remediation.
- The reset RPC clears the documented user-progress registry in dependency-safe order while preserving identity and settings.
- User-scoped views run with `security_invoker = true`.

## Evidence and limits

Static type/lint checks and the curriculum validator pass. A live database was not available in this repository-only environment, so reset population tests, cross-user RLS isolation, timezone boundary/DST tests, and export/import round-trip equivalence remain required before production approval.
