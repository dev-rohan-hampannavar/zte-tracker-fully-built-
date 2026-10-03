"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { FocusSession, FocusSessionMode, StudySessionActivity } from "@/types/database";

const supabase = createClient();

/**
 * The user's currently running/paused focus session, if any — used to
 * restore an in-progress timer across page reloads/navigation instead of
 * silently losing it. Also opportunistically marks stale (>4h) sessions
 * abandoned server-side before reading, so a forgotten timer from
 * yesterday doesn't show as "still running."
 */
export function useActiveFocusSession(userId: string | undefined) {
  return useSWR(userId ? ["focus-session-active", userId] : null, async () => {
    await supabase.rpc("abandon_stale_focus_sessions" as never, {} as never);
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", userId!)
      .in("status", ["running", "paused"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as FocusSession | null) ?? null;
  });
}

/** Every focus_sessions row (running, paused, completed, abandoned) for
 * this user — used by Settings export/backup for full history. */
export function useAllFocusSessions(userId: string | undefined) {
  return useSWR(userId ? ["focus-sessions-all", userId] : null, async () => {
    const { data, error } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", userId!)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as FocusSession[];
  });
}

export async function startFocusSession(
  userId: string,
  params: {
    mode: FocusSessionMode;
    plannedSeconds?: number | null;
    activity: StudySessionActivity;
    goalId?: string | null;
    milestoneId?: string | null;
    topicId?: string | null;
    stageProjectId?: string | null;
    // Set when starting from a /daily-plan task row, so
    // complete_focus_session can complete that plan task atomically once
    // the timer finishes — see migration 0056.
    planTaskKey?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: userId,
      mode: params.mode,
      status: "running",
      planned_seconds: params.plannedSeconds ?? null,
      activity: params.activity,
      goal_id: params.goalId ?? null,
      milestone_id: params.milestoneId ?? null,
      topic_id: params.topicId ?? null,
      stage_project_id: params.stageProjectId ?? null,
      plan_task_key: params.planTaskKey ?? null,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as FocusSession;
}

export async function pauseFocusSession(id: string, elapsedSeconds: number) {
  const { error } = await supabase
    .from("focus_sessions")
    .update({ status: "paused", elapsed_seconds: elapsedSeconds } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function resumeFocusSession(id: string) {
  const { error } = await supabase
    .from("focus_sessions")
    .update({ status: "running", last_resumed_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Completes the session via the atomic complete_focus_session RPC, which
 * in one statement: marks the focus_sessions row completed, inserts the
 * corresponding study_sessions row (so it feeds the existing "Today's
 * sessions" list / heatmap / streaks), and increments daily_logs. Returns
 * the new study_sessions id.
 */
export async function completeFocusSession(id: string, finalElapsedSeconds: number, note?: string) {
  const { data, error } = await supabase.rpc(
    "complete_focus_session" as never,
    { p_focus_session_id: id, p_final_elapsed_seconds: Math.round(finalElapsedSeconds), p_note: note || null } as never
  );
  if (error) throw error;
  return data as string | null;
}

/** Stops without logging any time — e.g. a session started by mistake. */
export async function discardFocusSession(id: string) {
  const { error } = await supabase
    .from("focus_sessions")
    .update({ status: "abandoned", ended_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export const FOCUS_ACTIVITY_LABELS: Record<StudySessionActivity, string> = {
  learn: "Learn",
  practice: "Practice",
  project: "Project",
  revision: "Revision",
  dsa: "DSA",
  other: "Other",
};

export const POMODORO_SECONDS = 25 * 60;
export const POMODORO_BREAK_SECONDS = 5 * 60;
