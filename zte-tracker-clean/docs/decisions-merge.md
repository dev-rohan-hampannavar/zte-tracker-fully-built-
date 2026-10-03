# Architecture Decisions — Career System Merge (2026-09-21)

These entries augment `docs/DECISIONS.md`. They record every non-trivial
decision made during the career_timeline_zte.docx + career_tracker.xlsx
integration.

---

## D-MERGE-01: Do not create a CareerGoal table

**Decision:** Use the existing `goals` table for career goals.

**Rationale:** `goals` already has `category`, `priority`, `status`,
`target_date`, and a foreign key relationship to `milestones`. Creating a
separate `CareerGoal` entity would split career planning data across two
parallel systems with identical schemas.

**Trade-off:** `goals` is a generic entity. Career checkpoints sit alongside
study goals and project goals. We distinguish them with `category = 'career'`.

---

## D-MERGE-02: Exit months are computed, never stored

**Decision:** Remove hardcoded month estimates from `full-plan.ts` SALARY_REFERENCE
labels. Month values are always derived from `exit_hours_required / (weekly_hours × 4.33)`.

**Rationale:** The original labels ("Exit A · ~7 mo") assume 40 h/wk. The
actual user pace (30 h/wk from `career_plan_weekly_hours`) changes Exit A to
9.5 months — 35% longer. A hardcoded label is wrong for any non-40 h/wk user.

**Impact:** `nextExitPoint()` now takes `weeklyHours` as a second parameter.
All call sites must be updated to pass `settings.career_plan_weekly_hours ?? 30`.

---

## D-MERGE-03: Spreadsheet Weekly Log is replaced by study_events

**Decision:** Do not import or maintain the spreadsheet's Weekly Log sheet.
ZTE's `study_events` table is the canonical source for cumulative hours.

**Rationale:** The spreadsheet requires manual entry. ZTE auto-logs hours
from focus timer sessions, daily plan completions, and manual session logs.
The spreadsheet is a fallback for users not using the app; once in the app,
it is redundant.

**Action for user:** Stop updating the spreadsheet Weekly Log. All hours
tracked via the app appear on the `/career-plan` page.

---

## D-MERGE-04: Scenario model stored in DB, not TypeScript

**Decision:** The low/base/high CTC scenario data lives in `career_scenarios`
table, not hardcoded in `full-plan.ts`.

**Rationale:** `full-plan.ts` already has `SALARY_REFERENCE` for exit bands.
The scenario model (age-keyed projections) is a different shape and different
purpose. Keeping them in the same file would bloat it. The DB table is also
editable by the user (future feature) without a code deploy.

**Trade-off:** Requires a DB fetch for the scenarios page. The data is seeded
read-only and cached aggressively in `useCareerScenarios()`.

---

## D-MERGE-05: career_pivots is read-only reference data

**Decision:** `career_pivots` has RLS that allows reads but no writes by
application users. No user-owned pivot data.

**Rationale:** The pivot data (O1-D5 salary ranges and descriptions) comes
from public salary guides and is the same for all users. Per-user pivot
tracking (e.g., "I'm pursuing O2") belongs in `goals` with `category = 'ops_pivot'`,
not in a new column on `career_pivots`.

---

## D-MERGE-06: Financial runway warning does not block anything

**Decision:** The dashboard/career-plan page shows a warning when the
6-month savings buffer won't be ready before Exit A, but does not prevent
applications or other actions.

**Rationale:** The career docs explicitly say "keep the ops job until you
hold an offer" — the plan already handles the buffer timing by not requiring
resignation before an offer is in hand. The warning is informational, not a
gate. A gate would be paternalistic and would break the core hybrid-path logic.

---

## D-MERGE-07: Notice period days in financial_profiles, not user_settings

**Decision:** `notice_period_days` is added to `financial_profiles`, not to
`user_settings`.

**Rationale:** It is a financial/career constraint (affects resignation timing
and runway calculations), not a display or behavior preference. `user_settings`
governs app behavior; `financial_profiles` governs financial state. They are
separate concerns.

---

## D-MERGE-08: career_plan_track "plan_a" = "hybrid" from the docs

**Decision:** No new track value is added. The existing `plan_a` track maps
to the "hybrid" path described in the career docs (keep ops job, study ZTE,
switch when offer arrives). The existing `ops` track maps to "pure ops".

**Rationale:** The naming difference is cosmetic. Adding a "hybrid" value
would break existing `career_plan_track` comparisons and require a migration
to update existing user rows. The current names are consistent with ZTE's
own framing and do not need to match the consulting document's terminology.

---

## D-MERGE-09: Kill criteria seeded as milestones, not a new table

**Decision:** The checkpoints from career_timeline_zte.docx §15 are seeded
as `milestones` rows under a `goals` row with `title = 'ZTE Career Checkpoints'`.

**Rationale:** Milestones already have `title`, `description`, `deadline`,
`status`, and `order_index`. A dedicated `CareerCheckpoint` table would
duplicate this schema. The milestone entity is the right abstraction.

**Trade-off:** Milestone `description` carries the minimum hours and action
text as a string. A richer structured format (e.g., `{min_hours: 270, action: "..."}`)
would require either a JSONB column on milestones or a new table. The current
decision keeps it simple and revisable.

---

## D-MERGE-10: No "career graph" entity

**Decision:** The relationship graph described in the spec (goal → role →
skills → gap → roadmap → tasks → projects → portfolio → applications → offers)
is a derived view over existing tables, not a stored graph entity.

**Rationale:** ZTE's tables already encode these relationships through foreign
keys and join queries. A stored graph entity would duplicate the relational
data and create a synchronization problem. The "career graph" is a conceptual
description of what the existing schema already represents, not a new storage
requirement.

**Implementation:** The relationships are surfaced through computed properties
in the readiness engine (`computeJobReadiness`) and the exit engine
(`computeAllExitStatuses`). Dashboard derived metrics join these outputs.
