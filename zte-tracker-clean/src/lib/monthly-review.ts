/**
 * Monthly Career Review — spec section 20.
 *
 * Deliberately not computeWeeklyReview stretched to 30 days: that
 * function is built around daily_plan_task_state's per-task granularity,
 * which is the right shape for "what did I do this week" but not for
 * "how did this month compare to last month" — month-over-month change is
 * the actual ask here (section 20: "Month-over-month change"), which
 * needs two aggregated periods side by side, not one wider single window.
 *
 * Every figure is a real count/sum over already-existing rows
 * (dsa_progress, career_tracker, phases, interview_attempts) — no
 * estimation. "Salary target progress" (spec) is reported as the actual
 * salary_range values seen on this month's applications rather than a
 * percentage against a target, because there's no persisted target salary
 * anywhere in this schema to honestly measure progress against — showing
 * a fake percentage would be exactly the "misleading readiness/progress
 * numbers" the master spec prohibits (section 2).
 */

import type { DsaProgressRow, CareerTrackerRow } from "@/types/database";

export interface MonthlyReviewPeriodStats {
  monthLabel: string; // "2026-08"
  dsaSolved: number;
  applicationsSubmitted: number;
  interviewAttemptsLogged: number;
  offersReceived: number;
  phasesCompletedByMonthEnd: number; // cumulative, for month-over-month framing
  salaryRangesSeen: string[]; // raw salary_range strings from this month's applications — factual, not a computed target-progress %
}

export interface MonthlyReview {
  current: MonthlyReviewPeriodStats;
  previous: MonthlyReviewPeriodStats;
  dsaDelta: number;
  applicationsDelta: number;
  interviewAttemptsDelta: number;
}

function monthKey(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return dateStr.slice(0, 7); // YYYY-MM
}

function statsForMonth(
  month: string,
  dsaRows: DsaProgressRow[],
  applications: CareerTrackerRow[],
  interviewAttemptDates: string[],
  phasesCompletedTotalByMonth: (month: string) => number
): MonthlyReviewPeriodStats {
  const monthApps = applications.filter((a) => monthKey(a.applied_at) === month);
  return {
    monthLabel: month,
    dsaSolved: dsaRows.filter((d) => d.completed && monthKey(d.completed_at) === month).length,
    applicationsSubmitted: monthApps.filter((a) => a.application_status !== "wishlist").length,
    interviewAttemptsLogged: interviewAttemptDates.filter((d) => monthKey(d) === month).length,
    offersReceived: monthApps.filter((a) => a.offer).length,
    phasesCompletedByMonthEnd: phasesCompletedTotalByMonth(month),
    salaryRangesSeen: monthApps.map((a) => a.salary_range).filter((s): s is string => !!s && s.trim().length > 0),
  };
}

export function computeMonthlyReview(
  dsaRows: DsaProgressRow[],
  applications: CareerTrackerRow[],
  interviewAttemptDates: string[],
  // Cumulative phases-completed-by-end-of-month, passed in as a function
  // rather than a raw completion timestamp list, since phase completion
  // isn't independently timestamped anywhere in this schema (topic
  // completion is, via topic_progress, but "phase complete" is a derived
  // condition computed client-side elsewhere) — callers that have a real
  // per-phase completion date can supply an accurate function; callers
  // that don't should pass one returning the current total for both
  // months rather than fabricate a monthly breakdown that doesn't exist.
  phasesCompletedTotalByMonth: (month: string) => number,
  referenceDate = new Date()
): MonthlyReview {
  const current = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const previous = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const currentMonth = current.toISOString().slice(0, 7);
  const previousMonth = previous.toISOString().slice(0, 7);

  const interviewAttemptDatesArr = interviewAttemptDates ?? [];
  const currentStats = statsForMonth(currentMonth, dsaRows, applications, interviewAttemptDatesArr, phasesCompletedTotalByMonth);
  const previousStats = statsForMonth(previousMonth, dsaRows, applications, interviewAttemptDatesArr, phasesCompletedTotalByMonth);

  return {
    current: currentStats,
    previous: previousStats,
    dsaDelta: currentStats.dsaSolved - previousStats.dsaSolved,
    applicationsDelta: currentStats.applicationsSubmitted - previousStats.applicationsSubmitted,
    interviewAttemptsDelta: currentStats.interviewAttemptsLogged - previousStats.interviewAttemptsLogged,
  };
}
