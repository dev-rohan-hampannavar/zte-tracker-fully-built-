"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { StudySession, StudySessionActivity } from "@/types/database";
import { todayISO } from "@/lib/utils";

const supabase = createClient();

/** All of today's individual logged sessions, most recent first — the raw
 * record backing the "Today's Sessions" list. Distinct from daily_logs,
 * which stays a single rolled-up hours-per-day row for streak/heatmap. */
export function useTodaysSessions(userId: string | undefined) {
  return useSWR(userId ? ["study-sessions", userId, todayISO()] : null, async () => {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId!)
      .eq("date", todayISO())
      .order("logged_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as StudySession[];
  });
}

/** Every study_sessions row for this user, regardless of date — used by
 * Settings export/backup so a full export actually includes session-level
 * history, not just the daily_logs rollup. */
export function useAllStudySessions(userId: string | undefined) {
  return useSWR(userId ? ["study-sessions-all", userId] : null, async () => {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId!)
      .order("logged_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as StudySession[];
  });
}

export async function logStudySessionEntry(
  userId: string,
  params: {
    hours: number;
    activity: StudySessionActivity;
    topicId?: string | null;
    stageProjectId?: string | null;
    notes?: string;
    isTutorial?: boolean | null;
  }
) {
  void userId; // ownership is derived from auth.uid() inside the RPC
  // Route manual entries through the same server transaction as focus-timer
  // and daily-plan activity. The RPC inserts the compatibility study_sessions
  // row, canonical study_events row, and daily_logs roll-up atomically.
  const { error } = await supabase.rpc("record_study_session" as never, {
    p_date: todayISO(),
    p_hours: params.hours,
    p_activity: params.activity,
    p_topic_id: params.topicId ?? null,
    p_stage_project_id: params.stageProjectId ?? null,
    p_note: params.notes || null,
    p_is_tutorial: params.isTutorial ?? null,
  } as never);
  if (error) throw error;
}
