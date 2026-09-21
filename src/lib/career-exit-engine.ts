/**
 * Career Exit Engine — computes exit point status from cumulative
 * logged hours, the user's weekly pace, and the start date.
 *
 * This is the new service that bridges the career_tracker.xlsx
 * Exit Plan sheet logic into ZTE's existing data model. It is
 * deliberately a pure TypeScript function with no direct DB calls —
 * the inputs are fetched upstream (study_events aggregate, exit_ladder
 * rows with exit_hours_required, user_settings career_plan_*) and
 * passed in so the function stays unit-testable.
 *
 * Design decisions (see career-plan-integration.md §4):
 * - "Roadmap pace" (pace.ts) = actual vs topic-estimated hours.
 *   That is a different signal; do not merge it here.
 * - Exit months are always computed from weekly_hours, never hardcoded.
 * - Status is derived, never manually set by the user.
 */

export type ExitStatus =
  | "not_started"   // no hours logged yet
  | "upcoming"      // not reached; on track to reach on time
  | "in_progress"   // hours logged, not yet at exit requirement
  | "at_risk"       // lagging more than 15% behind planned pace
  | "overdue"       // target date has passed without reaching hours
  | "reached";      // cumulative hours ≥ exit_hours_required

export interface ExitPoint {
  exitCode: string;              // e.g. "E01"
  exitLabel: string;             // e.g. "Exit A"
  afterPhase: string;            // e.g. "Phase 06"
  hoursRequired: number;         // from exit_ladder.exit_hours_required
  salaryRange: string | null;    // from exit_ladder.salary_range
  jobLevel: string | null;       // from exit_ladder.job_level
  targetCompanies: string | null;
}

export interface ExitPointStatus extends ExitPoint {
  status: ExitStatus;
  pctComplete: number;           // hoursLogged / hoursRequired * 100, capped at 100
  hoursLogged: number;           // cumulative study hours so far
  hoursRemaining: number;        // max(0, hoursRequired - hoursLogged)
  projectedDate: string | null;  // ISO date when hours will be reached at current pace
  targetDate: string | null;     // ISO date planned at weekly_hours from start_date
  // Human-readable summary of the status, surfaced directly in the UI
  // rather than requiring a switch in every component.
  statusLabel: string;
}

/** Thin input type — only what this function needs from the DB rows. */
export interface ExitLadderRow {
  exit_code: string;
  name: string | null;
  job_level: string | null;
  salary_range: string | null;
  target_companies: string | null;
  linked_phase: string | null;
  exit_hours_required: number | null;
  order_index: number;
}

const WEEKS_PER_MONTH = 4.33;
// How far behind planned pace before calling a status "at_risk".
// 15% lag means more than ~1.5 months behind at 30 h/wk.
const AT_RISK_LAG_FRACTION = 0.15;

/** Adds decimal weeks to an ISO date string and returns a new ISO date. */
function addWeeks(dateISO: string, weeks: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + Math.ceil(weeks * 7));
  return d.toISOString().slice(0, 10);
}

/** Returns today's ISO date (YYYY-MM-DD). */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Given an exit's hours requirement, the user's weekly hours, and a
 * start date, returns the planned target date for reaching that exit.
 */
export function computeExitTargetDate(
  startDate: string,
  weeklyHours: number,
  hoursRequired: number
): string | null {
  if (weeklyHours <= 0 || hoursRequired <= 0) return null;
  const weeksNeeded = hoursRequired / weeklyHours;
  return addWeeks(startDate, weeksNeeded);
}

/**
 * Given hours logged so far and a recent weekly average, returns the
 * projected date when the exit requirement will be met.
 */
export function computeExitProjectedDate(
  hoursLogged: number,
  hoursRequired: number,
  recentWeeklyAvgHours: number
): string | null {
  if (recentWeeklyAvgHours <= 0) return null;
  if (hoursLogged >= hoursRequired) return today(); // already reached
  const weeksLeft = (hoursRequired - hoursLogged) / recentWeeklyAvgHours;
  return addWeeks(today(), weeksLeft);
}

/**
 * Determines the status of a single exit point.
 *
 * @param hoursRequired  - cumulative hours needed to reach this exit
 * @param hoursLogged    - total study hours logged so far
 * @param plannedHours   - hours that should have been logged by now at pace
 *                         (startDate → today at weeklyHours)
 * @param targetDate     - ISO date of planned completion
 */
function deriveStatus(
  hoursRequired: number,
  hoursLogged: number,
  plannedHours: number,
  targetDate: string | null
): ExitStatus {
  if (hoursLogged === 0) return "not_started";
  if (hoursLogged >= hoursRequired) return "reached";

  const todayISO = today();
  if (targetDate && todayISO > targetDate) return "overdue";

  // Only compute lag for exits that should have been started by now.
  if (plannedHours > 0 && hoursLogged < hoursRequired) {
    const lagFraction = (plannedHours - hoursLogged) / plannedHours;
    if (lagFraction > AT_RISK_LAG_FRACTION) return "at_risk";
  }

  return hoursLogged > 0 ? "in_progress" : "upcoming";
}

function statusLabel(status: ExitStatus, pctComplete: number): string {
  switch (status) {
    case "reached":    return "Reached ✓";
    case "overdue":    return "Overdue — catch up";
    case "at_risk":    return `At risk (${Math.round(pctComplete)}% done)`;
    case "in_progress": return `In progress — ${Math.round(pctComplete)}%`;
    case "upcoming":   return "Upcoming";
    case "not_started": return "Not started";
  }
}

/**
 * Computes status for all exit points in the user's exit ladder.
 *
 * @param exits                - exit_ladder rows (must include exit_hours_required)
 * @param totalHoursLogged     - sum of all study_events.duration_minutes / 60
 * @param weeklyHours          - user_settings.career_plan_weekly_hours
 * @param startDate            - user_settings.career_plan_start_date
 * @param recentWeeklyAvgHours - trailing 4-week average from pace calculations;
 *                               used for "projected date" only, not status
 */
export function computeAllExitStatuses(
  exits: ExitLadderRow[],
  totalHoursLogged: number,
  weeklyHours: number,
  startDate: string,
  recentWeeklyAvgHours: number
): ExitPointStatus[] {
  const todayISO = today();
  const startMs = new Date(`${startDate}T00:00:00`).getTime();
  const todayMs = new Date(`${todayISO}T00:00:00`).getTime();
  const weeksElapsed = Math.max(0, (todayMs - startMs) / (7 * 24 * 3600 * 1000));
  const plannedHoursToDate = weeklyHours * weeksElapsed;

  return exits
    .filter((e) => e.exit_hours_required !== null && e.exit_hours_required > 0)
    .sort((a, b) => a.order_index - b.order_index)
    .map((e) => {
      const hoursRequired = e.exit_hours_required as number;
      const hoursLogged = Math.min(totalHoursLogged, hoursRequired);
      const hoursRemaining = Math.max(0, hoursRequired - totalHoursLogged);
      const pctComplete = hoursRequired > 0
        ? Math.min(100, Math.round((totalHoursLogged / hoursRequired) * 100))
        : 0;

      // Planned hours that should have been accrued toward this exit by now:
      // capped at hoursRequired (no point showing "overplanned" hours for
      // an exit that was already reached or is far ahead).
      const exitPlannedHours = Math.min(plannedHoursToDate, hoursRequired);

      const targetDate = weeklyHours > 0
        ? computeExitTargetDate(startDate, weeklyHours, hoursRequired)
        : null;

      const projectedDate = totalHoursLogged < hoursRequired
        ? computeExitProjectedDate(totalHoursLogged, hoursRequired, recentWeeklyAvgHours)
        : todayISO;

      const status = deriveStatus(hoursRequired, totalHoursLogged, exitPlannedHours, targetDate);

      return {
        exitCode: e.exit_code,
        exitLabel: e.name ?? e.exit_code,
        afterPhase: e.linked_phase ?? "",
        hoursRequired,
        salaryRange: e.salary_range,
        jobLevel: e.job_level,
        targetCompanies: e.target_companies,
        status,
        pctComplete,
        hoursLogged: Math.min(totalHoursLogged, hoursRequired),
        hoursRemaining,
        projectedDate: status === "reached" ? null : projectedDate,
        targetDate,
        statusLabel: statusLabel(status, pctComplete),
      };
    });
}

/**
 * Returns the current exit (lowest not-yet-reached) and the next one.
 * Used by the dashboard to answer "where am I now?".
 */
export function currentAndNextExit(statuses: ExitPointStatus[]): {
  current: ExitPointStatus | null;
  next: ExitPointStatus | null;
} {
  const notReached = statuses.filter((s) => s.status !== "reached");
  const reached = statuses.filter((s) => s.status === "reached");

  return {
    current: notReached[0] ?? reached[reached.length - 1] ?? null,
    next: notReached[1] ?? null,
  };
}

/**
 * Computes exit months at a given weekly hour pace — replaces the hardcoded
 * month values in full-plan.ts SALARY_REFERENCE labels.
 *
 * @param hoursRequired - cumulative hours from exit_ladder
 * @param weeklyHours   - user's actual pace (from user_settings)
 * @returns human-readable string like "9.5 mo"
 */
export function exitMonthsLabel(hoursRequired: number, weeklyHours: number): string {
  if (weeklyHours <= 0) return "—";
  const months = hoursRequired / (weeklyHours * WEEKS_PER_MONTH);
  return `${months.toFixed(1)} mo`;
}

/**
 * Canonical exit hours by exit code. Used to seed exit_ladder and
 * as a reference in tests. Values from career_timeline_zte.docx §8
 * and career_tracker.xlsx Exit Plan sheet.
 */
export const EXIT_HOURS: Record<string, number> = {
  A:   1235, // Phase 06
  A2:  1346, // Phase 06b
  B:   1417, // Phase 07
  "★1": 1748, // Phase 08
  C:   1949, // Phase 10
  "★2": 2113, // Phase 11
  D:   2320, // Phase 12
  "3": 2943, // Phase 17
  E:   3034, // Phase 19
};
