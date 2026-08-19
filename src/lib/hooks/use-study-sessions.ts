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

export async function logStudySessionEntry(
  userId: string,
  params: {
    hours: number;
    activity: StudySessionActivity;
    topicId?: string | null;
    stageProjectId?: string | null;
    notes?: string;
  }
) {
  const { error } = await supabase.from("study_sessions").insert({
    user_id: userId,
    date: todayISO(),
    hours: params.hours,
    activity: params.activity,
    topic_id: params.topicId ?? null,
    stage_project_id: params.stageProjectId ?? null,
    notes: params.notes || null,
  } as never);
  if (error) throw error;
}
