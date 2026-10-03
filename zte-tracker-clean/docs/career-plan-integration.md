# Career Plan Integration — Audit & Architecture

## 1. What this document is

This is the output of Phase 0 (repository audit), Phase 1 (career data audit),
and Phase 2 (domain design) of the master merge spec. It maps every concept in
the career documents to its canonical ZTE equivalent, resolves conflicts, and
specifies exactly what database and service changes are needed.

---

## 2. Source material summary

Three files were supplied:

| File | Content |
|---|---|
| `career_timeline_zte.docx` | 36-section analysis: two career paths (ops vs hybrid dev), exit timelines at 25/30/40 h/wk, salary scenarios, pivot reference, kill criteria, 90-day plan |
| `career_summary_2pages.docx` | One-page decision summary for family/mentor |
| `career_tracker.xlsx` | Five sheets: Start (inputs), Weekly Log, Exit Plan, Scenarios (salary model), Pivots (pay reference) |

---

## 3. Source → ZTE mapping

### 3.1 Spreadsheet: Start sheet (inputs and runway)

| Spreadsheet cell | Value in doc | ZTE canonical location | Action |
|---|---|---|---|
| Start date | 2026-09-21 | `user_settings.career_plan_start_date` | **Already exists** — populate |
| Weekly study hours | 30 | `user_settings.career_plan_weekly_hours` | **Already exists** — populate |
| Monthly expenses | ₹22,000 (example) | `financial_profiles.monthly_expenses` | **Already exists** — populate |
| Monthly in-hand pay | ₹28,000 | `financial_profiles.monthly_income` | **Already exists** — populate |
| Savings so far | ₹0 (example) | `financial_profiles.savings` | **Already exists** — populate |
| Notice period (days) | 60 (example) | `financial_profiles` | **MISSING** — add column |
| Runway target (months) | 6 | `financial_profiles.emergency_months` | **Already exists** — populate |
| Monthly surplus | Derived: 6,000 | Derived from above | No DB change |
| Buffer target (₹) | Derived: 1,32,000 | Derived from above | No DB change |
| Months to reach buffer | Derived: 22 | Derived from above | No DB change |
| Planned hours to date | Derived | SUM from `study_events` | No DB change |
| Actual hours logged | Derived | SUM from `study_events` | No DB change |
| Hours ahead/behind | Derived | Derived | No DB change |

**Conclusion:** One new column needed: `notice_period_days INTEGER DEFAULT 60`
on `financial_profiles`. Everything else already exists.

---

### 3.2 Spreadsheet: Exit Plan sheet

The exit plan maps exit codes to cumulative hours. This is the critical missing
link. The existing `exit_ladder` table has `exit_code`, `salary_range`,
`job_level`, `target_companies`, and `linked_phase`, but NOT cumulative hours.

| Exit | After phase | Cumulative hours | ZTE exit_ladder.exit_code |
|---|---|---|---|
| A | 06 | 1,235 | E01 (verify) |
| A2 | 06b | 1,346 | E02 (verify) |
| B | 07 | 1,417 | E03 (verify) |
| ★1 | 08 | 1,748 | E04 (verify) |
| C | 10 | 1,949 | E05 (verify) |
| ★2 | 11 | 2,113 | E06 (verify) |
| D | 12 | 2,320 | E07 (verify) |
| 3 | 17 | 2,943 | E08 (verify) |
| E | 19 | 3,034 | E09 (verify) |

**Action:** Add `exit_hours_required INTEGER` column to `exit_ladder` and
seed it with the values above (matched by `exit_code` or `linked_phase`).

The status column in the spreadsheet (Upcoming/On track/Overdue) is a derived
computation: `(total_logged_hours / exit_hours_required) * 100` against a
deadline derived from `start_date + (exit_hours_required / weekly_hours / 4.33)`.
This lives in a new service function, not the DB.

---

### 3.3 Spreadsheet: Weekly Log sheet

This is 107 rows of week-by-week planned and actual hours. In ZTE, actual hours
live in `study_events` (canonical ledger) with compatibility rows in
`study_sessions` and `daily_logs`. The spreadsheet's planned hours are derived
from `user_settings.career_plan_weekly_hours`. There is zero new data to migrate
here — the spreadsheet is a manual tracking alternative to what ZTE already does
automatically from session logging.

**Action:** None. Surface the ZTE aggregate on the career plan page instead of
asking the user to maintain both.

---

### 3.4 Spreadsheet: Scenarios sheet

Low/base/high CTC projections by age for ops and dev paths:

| Age | Ops low | Ops base | Ops high | Dev low | Dev base | Dev high |
|---|---|---|---|---|---|---|
| 24 | 4.6 | 4.6 | 4.6 | 4.6 | 4.6 | 4.6 |
| 26 | 5.5 | 7.0 | 8.5 | 4.0 | 7.0 | 12.0 |
| 28 | 8.0 | 11.0 | 14.0 | 6.5 | 11.0 | 20.0 |
| 31 | 12.5 | 18.0 | 24.0 | 10.5 | 17.0 | 32.0 |
| 34 | 17.0 | 26.0 | 36.0 | 15.0 | 25.0 | 45.0 |

The existing `full-plan.ts` already has `SALARY_REFERENCE` with exit bands for
`plan_a`, `sap`, `ba_pm`, and `ops` tracks. However it does not have the
three-case (low/base/high) model or the age-keyed projections.

**Conflict:** `full-plan.ts` maps to ZTE exit points (Exit A, B, ★1 etc.) for
`plan_a`, while the career docs add an ops-path progression by age and a
scenario model that spans both paths. These are genuinely different shapes.

**Canonical decision:** Store the scenario data as a new reference table
`career_scenarios` (path × scenario × age points as JSONB). The
`SALARY_REFERENCE` in `full-plan.ts` stays for the exit-point display in
`/career-plan`. The new table feeds a dedicated scenario visualization on the
same page (or a new `/career-plan/scenarios` tab).

---

### 3.5 Spreadsheet: Pivots sheet

11 pivot roles with entry/mid/senior pay ranges and confidence ratings.

This data does not exist anywhere in ZTE. It is reference data, not user data.
It should live in a new seeded-read-only table `career_pivots` with RLS allowing
any authenticated user to read, no user-owned data at all.

---

### 3.6 Career documents: Kill criteria / checkpoints

Checkpoints at months 3, 6, 10, 14, 18 with minimum hours:

| Month | On-plan hours | Minimum hours (70%) |
|---|---|---|
| 3 | 390 | 270 |
| 6 | 780 | 540 |
| 10 | 1,235 | 900 |
| 14 | 1,748 | 1,270 |
| 18 | 2,600+ | — |

ZTE already has `goals` and `milestones` tables. These checkpoints map naturally
to milestones under a "ZTE Career Checkpoints" goal. They should be seeded as
real milestone rows linked to the user's plan start date.

**Canonical decision:** Seed these as `milestones` under a `goals` row with
`category = 'career'` and `title = 'ZTE Career Checkpoints'`. Deadline for each
milestone = `start_date + N months`. Minimum hours becomes a milestone note, not
a separate column (notes are already JSONB-compatible text).

---

## 4. Conflicts resolved

### 4.1 Hardcoded exit months in `full-plan.ts`

`SALARY_REFERENCE` includes labels like `"Exit A · ~7 mo"`. This 7-month figure
is calculated at 40 h/wk. At Rohan's actual 30 h/wk, Exit A is 9.5 months. The
label is wrong for anyone not at 40 h/wk.

**Fix:** The `~7 mo` text in `SALARY_REFERENCE` labels becomes a dynamic
computation: `(exit_hours_required / weekly_hours / 4.33).toFixed(1) + " mo"`.
The `nextExitPoint` function already takes a progress percentage; it should also
receive `weeklyHours` to compute the dynamic month estimate. This is a pure TS
change, no DB migration.

### 4.2 Career plan track naming: "plan_a" vs "hybrid"

The career docs use "hybrid" (keep ops job + study ZTE + switch when offer
arrives) vs "pure ops". ZTE uses `plan_a` for the dev path and `ops` for
the ops-only track. These are the same concepts with different names.

**Canonical decision:** Keep the existing ZTE names. `plan_a` = hybrid dev
path. `ops` = pure ops. No migration needed; document the mapping.

### 4.3 Weekly hours used for pace calculations

`pace.ts` uses `computePaceStatus` which compares actual hours vs topic-estimated
hours — this is a "roadmap pace" metric, not an "exit timeline" metric.
The career exit engine needs a separate calculation using `career_plan_weekly_hours`
and `exit_hours_required`.

**Fix:** Two distinct pace concepts:
- **Roadmap pace** (existing): actual hours vs topic estimated hours. Lives in `pace.ts`.
- **Exit pace** (new): actual cumulative hours vs `exit_hours_required` at
  planned `weekly_hours` pace. Lives in new `career-exit-engine.ts`.

Do not conflate them.

### 4.4 Financial runway vs. exit timing

The spreadsheet compares "months to reach 6-month buffer (22 months)" vs "months
to Exit A (9.5 months)". The implication is the savings buffer will NOT be ready
by Exit A at current surplus (₹6,000/mo). This is a critical warning the
dashboard should surface.

ZTE has the financial data (`financial_profiles`) but no code that computes and
surfaces this comparison. New service needed.

---

## 5. What NOT to build

The prompt's potential entity list includes many concepts that already exist:

| Listed entity | ZTE equivalent | Decision |
|---|---|---|
| `CareerGoal` | `goals` table | Reuse |
| `TargetRole` | `target_roles` table | Reuse |
| `CareerMilestone` | `milestones` table | Reuse |
| `CareerPhase` | `phases` table | Reuse |
| `Skill` / `Technology` | `technologies` table | Reuse |
| `SkillAssessment` / `SkillGap` | `skill_evidence` view + `computeJobReadiness` | Reuse |
| `LearningTask` | `topic_progress` | Reuse |
| `Project` | `project_progress` + `advanced_project_progress` | Reuse |
| `DSAProblem` | `dsa_progress` | Reuse |
| `InterviewPreparation` | `interview_questions` + `interview_attempts` | Reuse |
| `Interview` | `interview_rounds` | Reuse |
| `Application` | `career_tracker` | Reuse |
| `DailyPlan` | `daily_plan_task_state` | Reuse |
| `WeeklyPlan` | `weekly_commitments` | Reuse |
| `FinancialConstraint` | `financial_profiles` | Reuse |
| `ResumeVersion` | `career_tracker.resume_version` | Reuse |
| `Achievement` | `achievements.ts` logic | Reuse |
| `CareerEvent` | `activity_log` | Reuse |

**Do not create new tables for any of the above.**

---

## 6. New entities — definitive list

Only four additions are justified:

### 6.1 `exit_ladder_hours` (column on existing table)

Add `exit_hours_required INTEGER` to the existing `exit_ladder` table.
This is the only structural addition that cannot be derived from existing data.

### 6.2 `notice_period_days` (column on existing table)

Add `notice_period_days INTEGER DEFAULT 60` to `financial_profiles`.

### 6.3 `career_scenarios` (new reference table)

Seeded reference data for the low/base/high CTC model. No user data.

```sql
CREATE TABLE career_scenarios (
  id          SERIAL PRIMARY KEY,
  path        TEXT NOT NULL,    -- 'ops' | 'dev'
  scenario    TEXT NOT NULL,    -- 'low' | 'base' | 'high'
  age_points  JSONB NOT NULL,   -- [{age: 24, ctc_lpa: 4.6}, ...]
  anchor      TEXT,             -- source citation
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 6.4 `career_pivots` (new reference table)

Seeded reference data for the O1-D5 pivot options.

```sql
CREATE TABLE career_pivots (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL,       -- 'O1', 'O2', 'D1', etc.
  path            TEXT NOT NULL,       -- 'ops' | 'dev' | 'both'
  title           TEXT NOT NULL,
  entry_range     TEXT,                -- '₹3–6 LPA'
  mid_range       TEXT,
  senior_range    TEXT,
  confidence      TEXT,                -- 'H' | 'M' | 'L'
  source          TEXT,
  why_it_fits     TEXT,
  barrier         TEXT,
  order_index     INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. New services — definitive list

### 7.1 `src/lib/career-exit-engine.ts`

Computes exit point status from cumulative hours, weekly pace, and start date.
See implementation file.

### 7.2 `src/lib/career-runway-engine.ts`

Extends the existing `financial_profiles` data into:
- Monthly surplus (income − expenses)
- Months to buffer target
- Buffer-ready date
- Exit A projected date
- Warning: buffer not ready before Exit A
See implementation file.

### 7.3 Patch to `src/data/full-plan.ts`

`nextExitPoint` and `SALARY_REFERENCE` labels currently hardcode 40 h/wk
month estimates. The `nextExitPoint` function should accept `weeklyHours: number`
as a second parameter and compute dynamic month estimates from the canonical
`EXIT_HOURS` constant.

---

## 8. UI changes needed

### 8.1 `/career-plan` page

Currently shows: phase progress, current exit, timeline.

Add:
- Exit timing table computed from actual `weekly_hours` (not 40 h/wk)
- "On track / At risk / Overdue" status per exit point
- Financial runway panel: buffer-ready date vs Exit A date with warning if
  buffer arrives after Exit A

### 8.2 Dashboard

The five-question framework from the spec is mostly covered. One gap:
- "Am I on track?" should show: exit target, hours logged vs plan, and the
  runway warning if buffer is underfunded before Exit A.

### 8.3 `/exit-ladder` page (or `/career-plan`)

Show `exit_hours_required` alongside the existing salary ranges.
Show computed target date at current weekly pace.

---

## 9. Data to seed for Rohan (not generic defaults)

The spreadsheet contains example values with explicit instructions to replace
them. Seed the following as the user's actual financial profile and plan
settings when the migration runs (these become defaults; the user can edit them):

```
career_plan_start_date: '2026-09-21'
career_plan_weekly_hours: 30
financial_profiles.monthly_income: 28000
financial_profiles.monthly_expenses: 22000
financial_profiles.savings: 0
financial_profiles.emergency_months: 6
financial_profiles.notice_period_days: 60
financial_profiles.minimum_switch_salary: 700000  -- ₹7L (low end of Exit A band)
```

These are "example" values from the spreadsheet marked for replacement. The
migration seeds them as the starting state; all are user-editable in the UI.

---

## 10. Rejected duplications

| Concept in prompt | Rejected because |
|---|---|
| `CareerPath` table | Covered by `career_plan_track` in `user_settings` |
| `CareerGap` entity | Already computed by `computeJobReadiness` → `skillGaps` |
| `ExecutionMetric` table | Already in `study_events` + aggregation views |
| `PortfolioItem` table | Already in `project_progress.deployment_url` + `advanced_project_progress` |
| Separate `SkillAssessment` table | Already in `skill_evidence` view |
| `CareerMetric` table | All metrics are derived from existing tables; no new storage |
| `RoadmapPhase`/`RoadmapTopic` entities | Already: `phases`, `stages`, `topics` |
| `ExperienceMilestone` | Already: `milestones` under a career goal |

---

## 11. Implementation sequence

Execute in this order to stay safe:

1. **Migration `0067_career_system_merge.sql`** — adds columns to existing
   tables, creates two new reference tables, seeds reference data.
   Zero destructive changes. Rollback = drop new columns + tables.

2. **`career-exit-engine.ts`** — pure TypeScript, no DB dependency.
   Unit-testable immediately after writing.

3. **`career-runway-engine.ts`** — same: pure TS, no new DB queries.

4. **Patch `full-plan.ts`** — `nextExitPoint` accepts `weeklyHours`;
   `SALARY_REFERENCE` month labels become `computeExitMonths(hours, wh)`.

5. **`/career-plan` page** — integrate both new engines.

6. **Dashboard** — add the runway warning if buffer > Exit A date.

7. **Seed Rohan's actual values** — run a one-time upsert for
   `user_settings` and `financial_profiles` after the migration.
