"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils";
import type { DailyPlanTaskState, DailyPlanTaskKind } from "@/types/database";
import type { PlanTask } from "@/lib/daily-planner";

const supabase = createClient();

/** Deterministic key a given plan task maps to in daily_plan_task_state —
 * see the naturalKey comment on PlanTask for why this has to be stable
 * across re-renders/re-generations of the same day's plan. */
export function planTaskKey(task: Pick<PlanTask, "kind" | "naturalKey">): string {
  return `${task.kind}:${task.naturalKey}`;
}

/**
 * Today's task-state rows, keyed by task_key for O(1) lookup against a
 * freshly generated plan. Opportunistically carries forward yesterday's
 * still-pending tasks first (idempotent server-side function — safe to
 * call on every load), so a task left undone doesn't just disappear when
 * the plan regenerates for a new day.
 */
export function useDailyPlanTaskState(userId: string | undefined, planDate: string = todayISO()) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ["daily-plan-task-state", userId, planDate] : null,
    async () => {
      await supabase.rpc("carry_forward_daily_plan_tasks" as never, { p_today: planDate } as never);
      const { data, error } = await supabase
        .from("daily_plan_task_state")
        .select("*")
        .eq("user_id", userId!)
        .eq("plan_date", planDate)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyPlanTaskState[];
    }
  );

  const byKey = new Map((data ?? []).map((row) => [row.task_key, row]));

  return { rows: data ?? [], byKey, error, isLoading, mutate };
}

/** Marks a plan task started (in_progress) — purely a UI-state row, no
 * time tracking side effect. Actual timing happens via the focus-session
 * flow when the person starts a real timer against the same task. */
export async function markDailyPlanTaskStarted(
  userId: string,
  planDate: string,
  task: Pick<PlanTask, "kind" | "naturalKey" | "title" | "estimatedMinutes">
) {
  const { error } = await supabase.from("daily_plan_task_state").upsert(
    {
      user_id: userId,
      plan_date: planDate,
      task_key: planTaskKey(task),
      kind: task.kind as DailyPlanTaskKind,
      title: task.title,
      status: "in_progress",
      estimated_minutes: task.estimatedMinutes,
      started_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,plan_date,task_key" }
  );
  if (error) throw error;
}

/** Marks a plan task skipped — an explicit "not doing this today" rather
 * than silently letting it carry forward forever. */
export async function markDailyPlanTaskSkipped(
  userId: string,
  planDate: string,
  task: Pick<PlanTask, "kind" | "naturalKey" | "title" | "estimatedMinutes">
) {
  const { error } = await supabase.from("daily_plan_task_state").upsert(
    {
      user_id: userId,
      plan_date: planDate,
      task_key: planTaskKey(task),
      kind: task.kind as DailyPlanTaskKind,
      title: task.title,
      status: "skipped",
      estimated_minutes: task.estimatedMinutes,
    } as never,
    { onConflict: "user_id,plan_date,task_key" }
  );
  if (error) throw error;
}

/** Marks a plan task completed via the atomic RPC — mirrors
 * complete_focus_session's pattern (one statement, no read-modify-write
 * race). actualMinutes/studySessionId are optional: a task can be ticked
 * off without a formal timed session. */
export async function completeDailyPlanTask(
  planDate: string,
  task: Pick<PlanTask, "kind" | "naturalKey" | "title" | "estimatedMinutes">,
  opts?: { actualMinutes?: number; studySessionId?: string; notes?: string }
) {
  const { error } = await supabase.rpc("complete_daily_plan_task" as never, {
    p_plan_date: planDate,
    p_task_key: planTaskKey(task),
    p_kind: task.kind,
    p_title: task.title,
    p_estimated_minutes: task.estimatedMinutes,
    p_actual_minutes: opts?.actualMinutes ?? null,
    p_study_session_id: opts?.studySessionId ?? null,
    p_notes: opts?.notes ?? null,
  } as never);
  if (error) throw error;
}

/** Reverts a completed/skipped task back to pending — undo affordance. */
export async function resetDailyPlanTask(userId: string, planDate: string, taskKey: string) {
  const { error } = await supabase
    .from("daily_plan_task_state")
    .update({ status: "pending", completed_at: null, actual_minutes: null } as never)
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .eq("task_key", taskKey);
  if (error) throw error;
}

/**
 * Rows across a date range (inclusive), for weekly-review aggregation.
 * Doesn't trigger carry-forward (that's only meaningful for "today").
 */
export function useDailyPlanTaskStateRange(userId: string | undefined, startDate: string, endDate: string) {
  return useSWR(userId ? ["daily-plan-task-state-range", userId, startDate, endDate] : null, async () => {
    const { data, error } = await supabase
      .from("daily_plan_task_state")
      .select("*")
      .eq("user_id", userId!)
      .gte("plan_date", startDate)
      .lte("plan_date", endDate)
      .order("plan_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as DailyPlanTaskState[];
  });
}

/**
 * Yesterday's rows for the end-of-day-style review — used both by an
 * explicit "yesterday" view and by the carried-forward badge logic in the
 * daily plan UI (rows here with status='pending' are what got carried).
 */
export function useDailyPlanTaskStateForDate(userId: string | undefined, planDate: string) {
  return useSWR(userId ? ["daily-plan-task-state", userId, planDate] : null, async () => {
    const { data, error } = await supabase
      .from("daily_plan_task_state")
      .select("*")
      .eq("user_id", userId!)
      .eq("plan_date", planDate)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as DailyPlanTaskState[];
  });
}
