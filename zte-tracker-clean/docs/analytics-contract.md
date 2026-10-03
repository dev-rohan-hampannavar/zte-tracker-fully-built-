# Analytics contract

All displayed metrics must name their source and unit. Calendar boundaries use the user's `user_settings.timezone` (IANA); missing activity remains in the denominator instead of disappearing.

| Metric ID | Definition | Unit | Source / calculation | Missing-data behavior |
| --- | --- | --- | --- | --- |
| `ROADMAP_TOPIC_COMPLETION` | Explicitly completed topics ÷ all canonical topics | % | `topics` joined to the caller's `topic_progress.completed` | 0% when no topics are complete; total always includes unstarted topics |
| `STUDY_TIME` | Sum of recorded activity duration | hours | Canonical `study_events.duration_minutes`; `daily_logs` is a compatibility roll-up | No events = 0h |
| `WEEKLY_TIME_ADHERENCE` | Completed planned minutes ÷ planned minutes | % | `time_blocks` and completed `daily_plan_task_state` in the selected local week | `N/A` when no minutes were planned |
| `COMMITMENT_RATE` | Completed weekly commitments ÷ commitments created | % | `weekly_commitments.status` for the selected local week | `N/A` when no commitments exist |
| `DSA_SOLVE_RATE` | Solved attempts ÷ recorded attempts | % | `dsa_progress` completed/attempts; never inferred from hours | `N/A` when no attempts exist |
| `APPLICATION_RESPONSE_RATE` | Applications receiving screening/interview/offer ÷ applications sent | % | `application_metrics` view, scoped by RLS | `N/A` when no applications were sent |
| `APPLICATION_OFFER_RATE` | Offers ÷ applications sent | % | `application_metrics` view | `N/A` when no applications were sent |
| `ROLE_READINESS` | Weighted satisfied evidence requirements ÷ assessed requirements | % | Explicit role-skill requirements and `skill_evidence`; weights live in `role_skill_requirements` | Shows assessed count and `NOT ASSESSED` when requirements are absent |
| `RUNWAY_MONTHS` | Savings ÷ monthly expenses | months | `/career-plan` financial profile calculator | `N/A` when expenses are zero |

Time spent is activity evidence only. It never changes `topic_progress.completed` or implies mastery; completion is an explicit server-authorized action and validation/freshness are separate states.

## Compatibility note

Existing screens still read `daily_logs` and `study_sessions` for historical compatibility. New manual logs, focus-timer completions, and daily-plan completions write a canonical `study_events` row in the same server transaction; future analytics should migrate reads to that ledger and treat the compatibility tables as projections.
