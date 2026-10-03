/**
 * Phase 2 — Weekly planning / weekly review.
 *
 * Pure aggregation over data already loaded elsewhere in the app — no new
 * table. Planned vs. actual completion comes from daily_plan_task_state
 * (added in Phase 1 for the Daily Operating System), which already
 * records a completed/skipped/pending outcome for every task the planner
 * surfaced across ALL domains (goals, revision, projects, interview prep,
 * learning) — exactly the cross-domain breakdown the spec's weekly review
 * asks for, so this reuses it rather than inventing a second notion of
 * "planned."
 *
 * DSA-solved and hours-logged are separate, additional signals folded in
 * from their own existing tables (dsa_progress, daily_logs) since DSA
 * practice and general study time aren't necessarily routed through a
 * generated plan task.
 */

import type { DailyPlanTaskState, DsaProgressRow, DailyLog } from "@/types/database";

export interface WeeklyReview {
  weekStart: string; // Monday, YYYY-MM-DD
  weekEnd: string; // Sunday, YYYY-MM-DD
  plannedTaskCount: number;
  completedTaskCount: number;
  skippedTaskCount: number;
  incompleteTaskCount: number;
  completionPct: number; // 0-100 by TASK COUNT, or 0 if nothing was planned this week — see adherencePct for the minutes-weighted figure
  plannedMinutes: number; // sum of estimated_minutes across every task planned this week
  completedPlannedMinutes: number; // sum of estimated_minutes for tasks actually completed
  adherencePct: number; // 0-100, completed planned minutes / total planned minutes — the spec's canonical plan-adherence metric (a 5-minute task and a 90-minute task don't count equally, unlike completionPct)
  topicsCompleted: number; // via 'learning' + 'revision' kind tasks completed
  dsaSolved: number;
  projectsProgressed: number; // distinct 'project' kind tasks completed
  revisionCompleted: number;
  actualHours: number;
  blockers: string[]; // titles of tasks left incomplete (pending or in_progress) by week's end
}

function mondayOf(date: Date): Date {
  const day = date.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Computes the review for the Monday-Sunday week containing `referenceDate`
 * (defaults to today) — pass a date in a past week to review that week
 * instead of the current one. */
export function computeWeeklyReview(
  planTaskRows: DailyPlanTaskState[],
  dsaRows: DsaProgressRow[],
  dailyLogs: DailyLog[],
  referenceDate: Date = new Date()
): WeeklyReview {
  const monday = mondayOf(referenceDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = localDateISO(monday);
  const weekEnd = localDateISO(sunday);

  const inWeek = (dateStr: string) => dateStr >= weekStart && dateStr <= weekEnd;

  // carried_forward rows (migration 0057) are prior-day snapshots of a
  // task that has since been re-carried onto a later date within the same
  // range — excluding them here, not just from completed/skipped/
  // incomplete below, is what actually prevents double-counting: without
  // this a task pending across 3 days would count 3x toward
  // plannedTaskCount/plannedMinutes even though only one of those rows is
  // the live, currently-open representation of it.
  const weekTasks = planTaskRows.filter((r) => inWeek(r.plan_date) && r.status !== "carried_forward");
  const completed = weekTasks.filter((r) => r.status === "completed");
  const skipped = weekTasks.filter((r) => r.status === "skipped");
  const incomplete = weekTasks.filter((r) => r.status === "pending" || r.status === "in_progress");

  const topicsCompleted = completed.filter((r) => r.kind === "learning" || r.kind === "revision").length;
  const revisionCompleted = completed.filter((r) => r.kind === "revision").length;
  const projectsProgressed = new Set(completed.filter((r) => r.kind === "project").map((r) => r.task_key)).size;

  const dsaSolved = dsaRows.filter((r) => r.completed && r.completed_at && inWeek(r.completed_at.slice(0, 10))).length;

  const actualHours = dailyLogs.filter((l) => inWeek(l.date)).reduce((sum, l) => sum + Number(l.hours), 0);

  // Plan adherence per the spec: completed planned minutes / total planned
  // minutes. Uses each task's estimated_minutes (the planned figure) as
  // the weight, not actual_minutes — a task counts toward the numerator
  // once it's marked completed, regardless of how long it actually took,
  // same as the task-count version above; only the denominator/weighting
  // differs. Skipped and incomplete tasks contribute to the denominator
  // (they were planned) but not the numerator.
  const plannedMinutes = weekTasks.reduce((sum, r) => sum + (r.estimated_minutes ?? 0), 0);
  const completedPlannedMinutes = completed.reduce((sum, r) => sum + (r.estimated_minutes ?? 0), 0);

  return {
    weekStart,
    weekEnd,
    plannedTaskCount: weekTasks.length,
    completedTaskCount: completed.length,
    skippedTaskCount: skipped.length,
    incompleteTaskCount: incomplete.length,
    completionPct: weekTasks.length > 0 ? Math.round((completed.length / weekTasks.length) * 100) : 0,
    plannedMinutes,
    completedPlannedMinutes,
    adherencePct: plannedMinutes > 0 ? Math.round((completedPlannedMinutes / plannedMinutes) * 100) : 0,
    topicsCompleted,
    dsaSolved,
    projectsProgressed,
    revisionCompleted,
    actualHours,
    blockers: incomplete.map((r) => r.title),
  };
}
