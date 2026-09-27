/**
 * PATCH: src/data/full-plan.ts
 *
 * Problem: SALARY_REFERENCE labels contain hardcoded month estimates
 * like "Exit A · ~7 mo" which assume 40 h/wk. At 30 h/wk (the
 * actual pace from career_plan_weekly_hours), Exit A is 9.5 months.
 *
 * The label is therefore wrong for any user not at exactly 40 h/wk.
 *
 * Fix:
 *  1. Remove month estimates from the SALARY_REFERENCE label strings.
 *     The label becomes just "Exit A", "Exit ★1", etc.
 *  2. Add EXIT_HOURS_REQUIRED: Record<string, number> to this file —
 *     the canonical source of hours per exit point.
 *  3. Update nextExitPoint() to accept weeklyHours and compute months
 *     dynamically from EXIT_HOURS_REQUIRED.
 *  4. Add computeExitMonthsLabel() helper for any component that needs
 *     to display "9.5 mo" next to an exit label.
 *
 * Apply as a direct edit to src/data/full-plan.ts.
 * The diff below shows every change to make.
 */

// ================================================================
// CHANGE 1: Add EXIT_HOURS_REQUIRED constant (new export)
// Add this block immediately after the existing SALARY_REFERENCE array.
// ================================================================

/*
export const EXIT_HOURS_REQUIRED: Record<string, number> = {
  A:    1235, // Phase 06  — Junior Full-Stack
  A2:   1346, // Phase 06b — Mobile add-on
  B:    1417, // Phase 07  — Junior-to-Mid
  "★1": 1748, // Phase 08  — Interview-ready (DSA)
  C:    1949, // Phase 10  — Mid, production-grade
  "★2": 2113, // Phase 11  — Mid-level
  D:    2320, // Phase 12  — Mid-Senior, AI-capable
  "3":  2943, // Phase 17  — Senior
  E:    3034, // Phase 19  — Complete profile
};

const WEEKS_PER_MONTH = 4.33;

/**
 * Computes the projected months to an exit at a given weekly hour pace.
 * Replaces the hardcoded ~7 mo, ~9.5 mo, etc. in the old label strings.
 *
 * @param exitCode   - one of the keys in EXIT_HOURS_REQUIRED
 * @param weeklyHours - from user_settings.career_plan_weekly_hours
 */
export function computeExitMonths(exitCode: string, weeklyHours: number): number | null {
  const hours = EXIT_HOURS_REQUIRED[exitCode];
  if (!hours || weeklyHours <= 0) return null;
  return hours / (weeklyHours * WEEKS_PER_MONTH);
}

export function computeExitMonthsLabel(exitCode: string, weeklyHours: number): string {
  const months = computeExitMonths(exitCode, weeklyHours);
  if (months === null) return "—";
  return `${months.toFixed(1)} mo`;
}
*/

// ================================================================
// CHANGE 2: Update SALARY_REFERENCE entries to remove hardcoded months
//
// Before (plan_a entries):
//   { track: "plan_a", label: "Exit A · ~7 mo",  range: "₹6–10 LPA",  evidence: "..." }
//   { track: "plan_a", label: "Exit B · ~7.5 mo", range: "₹8–12 LPA", evidence: "..." }
//   ... etc.
//
// After:
//   { track: "plan_a", label: "Exit A",  exitCode: "A",    range: "₹6–10 LPA",  evidence: "..." }
//   { track: "plan_a", label: "Exit B",  exitCode: "B",    range: "₹8–12 LPA",  evidence: "..." }
//   ... etc.
//
// Also update SalaryReference interface to add exitCode field:
//
// Before:
//   export interface SalaryReference {
//     track: CareerPlanTrack;
//     label: string;
//     range: string;
//     evidence: string;
//   }
//
// After:
//   export interface SalaryReference {
//     track: CareerPlanTrack;
//     label: string;
//     exitCode: string | null; // null for non-ZTE entries (sap, ba_pm, ops)
//     range: string;
//     evidence: string;
//   }
// ================================================================

// Full replacement for the plan_a entries in SALARY_REFERENCE:
/*
  { track: "plan_a", label: "Exit A",   exitCode: "A",    range: "₹6–10 LPA",   evidence: "Junior full-stack, deployed" },
  { track: "plan_a", label: "Exit B",   exitCode: "B",    range: "₹8–12 LPA",   evidence: "API-literate junior-to-mid" },
  { track: "plan_a", label: "Exit ★1",  exitCode: "★1",   range: "₹8–15 LPA",   evidence: "Interview-ready + DSA" },
  { track: "plan_a", label: "Exit C",   exitCode: "C",    range: "₹12–18 LPA",  evidence: "Production-grade + observability" },
  { track: "plan_a", label: "Exit ★2",  exitCode: "★2",   range: "₹15–25 LPA",  evidence: "Real-time + search" },
  { track: "plan_a", label: "Exit D",   exitCode: "D",    range: "₹20–30 LPA",  evidence: "AI-capable mid-senior" },
  { track: "plan_a", label: "Exit 3",   exitCode: "3",    range: "₹25–40 LPA",  evidence: "Senior distributed systems" },
  { track: "plan_a", label: "Exit E",   exitCode: "E",    range: "₹35–50 LPA",  evidence: "Complete profile / founding engineer" },
*/

// Non-ZTE entries stay the same but get exitCode: null:
/*
  { track: "sap",   label: "Now",        exitCode: null, range: "₹4.6 LPA", evidence: "Business ops associate, building SD/MM exposure" },
  // ... remaining sap, ba_pm, ops entries unchanged except exitCode: null
*/

// ================================================================
// CHANGE 3: Update nextExitPoint() signature and implementation
//
// Before:
//   export function nextExitPoint(overallProgressPct: number): NextExitPoint | null
//
// After:
//   export function nextExitPoint(
//     overallProgressPct: number,
//     weeklyHours: number = 40   // default to 40 for backward compatibility
//   ): NextExitPoint | null
//
// Before (inside the function):
//   const match = row.label.match(/~([\d.]+)\s*mo/);
//   if (!match) continue;
//   const rowMonth = Number(match[1]);
//
// After:
//   if (!row.exitCode) continue;
//   const hours = EXIT_HOURS_REQUIRED[row.exitCode];
//   if (!hours) continue;
//   const rowMonth = hours / (weeklyHours * WEEKS_PER_MONTH);
//
// The return type NextExitPoint already has approxMonth so no type change needed.
// ================================================================

/*
export function nextExitPoint(
  overallProgressPct: number,
  weeklyHours: number = 40
): NextExitPoint | null {
  const estimatedMonth = (overallProgressPct / 100) * ZTE_CORE_CURRICULUM_MONTHS;
  const exitRows = SALARY_REFERENCE.filter((r) => r.track === "plan_a" && r.exitCode);

  for (const row of exitRows) {
    const hours = EXIT_HOURS_REQUIRED[row.exitCode!];
    if (!hours) continue;
    const rowMonth = hours / (weeklyHours * WEEKS_PER_MONTH);
    if (rowMonth > estimatedMonth) {
      return {
        label: row.label,
        range: row.range,
        approxMonth: rowMonth,
      };
    }
  }
  return null;
}
*/

// ================================================================
// CALLERS TO UPDATE
//
// After making the above changes, search for all calls to nextExitPoint()
// and pass weeklyHours from the nearest available source:
//
//   const settings = useCareerPlanSettings(userId);
//   const next = nextExitPoint(overallPct, settings.data?.career_plan_weekly_hours ?? 30);
//
// Also update any component that renders a SALARY_REFERENCE label and
// currently parses the "· ~N mo" suffix — replace with:
//
//   computeExitMonthsLabel(row.exitCode, weeklyHours)
// ================================================================

export {}; // makes this a module so TypeScript doesn't complain about the comments
