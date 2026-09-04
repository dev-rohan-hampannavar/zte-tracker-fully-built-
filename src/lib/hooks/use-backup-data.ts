"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLogEntry,
  AdvancedProjectProgress,
  BuildInPublicStatus,
  CareerDecision,
  DailyPlanTaskState,
  ExerciseProgress,
  ManualItemCheck,
  RevisionHistory,
  StudyEvent,
  TopicResource,
  PublicStreakSummary,
} from "@/types/database";

const supabase = createClient();

/**
 * User-owned tables that are not needed on every screen but must be present
 * in a lossless Settings backup. Keeping the read set in one hook makes the
 * backup contract auditable and prevents a new feature from quietly being
 * omitted from export/import.
 */
export interface BackupDomainData {
  advanced_project_progress: AdvancedProjectProgress[];
  exercise_progress: ExerciseProgress[];
  build_in_public_status: BuildInPublicStatus[];
  manual_item_checks: ManualItemCheck[];
  revision_history: RevisionHistory[];
  career_decisions: CareerDecision[];
  topic_resources: TopicResource[];
  daily_plan_task_state: DailyPlanTaskState[];
  activity_log: ActivityLogEntry[];
  study_events: StudyEvent[];
  public_streak_summary: PublicStreakSummary[];
}

export function useBackupDomainData(userId: string | undefined) {
  return useSWR(userId ? ["backup-domain-data", userId] : null, async () => {
    const uid = userId!;
    const [
      advanced,
      exercises,
      buildInPublic,
      manualChecks,
      revision,
      decisions,
      resources,
      planState,
      activity,
      events,
      streakSummary,
    ] = await Promise.all([
      supabase.from("advanced_project_progress").select("*").eq("user_id", uid),
      supabase.from("exercise_progress").select("*").eq("user_id", uid),
      supabase.from("build_in_public_status").select("*").eq("user_id", uid),
      supabase.from("manual_item_checks").select("*").eq("user_id", uid),
      supabase.from("revision_history").select("*").eq("user_id", uid),
      supabase.from("career_decisions").select("*").eq("user_id", uid),
      supabase.from("topic_resources").select("*").eq("user_id", uid),
      supabase.from("daily_plan_task_state").select("*").eq("user_id", uid),
      supabase.from("activity_log").select("*").eq("user_id", uid),
      supabase.from("study_events").select("*").eq("user_id", uid),
      supabase.from("public_streak_summary").select("*").eq("user_id", uid),
    ]);
    const failed = [advanced, exercises, buildInPublic, manualChecks, revision, decisions, resources, planState, activity, events, streakSummary].find((result) => result.error);
    if (failed?.error) throw failed.error;
    return {
      advanced_project_progress: (advanced.data ?? []) as AdvancedProjectProgress[],
      exercise_progress: (exercises.data ?? []) as ExerciseProgress[],
      build_in_public_status: (buildInPublic.data ?? []) as BuildInPublicStatus[],
      manual_item_checks: (manualChecks.data ?? []) as ManualItemCheck[],
      revision_history: (revision.data ?? []) as RevisionHistory[],
      career_decisions: (decisions.data ?? []) as CareerDecision[],
      topic_resources: (resources.data ?? []) as TopicResource[],
      daily_plan_task_state: (planState.data ?? []) as DailyPlanTaskState[],
      activity_log: (activity.data ?? []) as ActivityLogEntry[],
      study_events: (events.data ?? []) as StudyEvent[],
      public_streak_summary: (streakSummary.data ?? []) as PublicStreakSummary[],
    } satisfies BackupDomainData;
  });
}
