"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { ActivityAction, ActivityLogEntry } from "@/types/database";

const supabase = createClient();

export function useActivityLog(userId: string | undefined, limit = 50) {
  return useSWR(userId ? ["activity-log", userId, limit] : null, async () => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ActivityLogEntry[];
  });
}

/**
 * Logs a meaningful action. Called explicitly at each write path that
 * matters (see the migration comment for why this isn't trigger-based).
 * undoPayload should contain exactly what's needed to reverse the action
 * via the same table/helper that made the change — e.g. for a deleted
 * application, the full row so it can be re-inserted; for a status
 * change, the previous status so it can be set back.
 */
export async function logActivity(
  userId: string,
  entry: {
    action: ActivityAction;
    entityType: string;
    entityId: string;
    summary: string;
    undoPayload?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("activity_log").insert({
    user_id: userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    summary: entry.summary,
    undo_payload: entry.undoPayload ?? null,
  } as never);
  // Activity logging failures should never block the actual user action
  // that triggered them — surfacing a toast error here would be more
  // disruptive than a silently missed history entry. Logged to console
  // for debugging instead.
  if (error) console.error("Failed to log activity", error);
}

export async function markActivityUndone(logId: string) {
  const { error } = await supabase.from("activity_log").update({ undone: true } as never).eq("id", logId);
  if (error) throw error;
}

export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  topic_completed: "Topic completed",
  goal_created: "Goal created",
  goal_updated: "Goal updated",
  goal_completed: "Goal completed",
  milestone_completed: "Milestone completed",
  project_started: "Project started",
  project_completed: "Project completed",
  task_deleted: "Task deleted",
  application_created: "Application added",
  application_status_changed: "Application status changed",
  application_deleted: "Application deleted",
  interview_completed: "Interview round completed",
  skill_added: "Skill added",
  skill_removed: "Skill removed",
  dsa_problem_solved: "DSA problem solved",
  revision_completed: "Revision completed",
  career_target_changed: "Career target changed",
  weekly_commitment_created: "Weekly commitment added",
};
