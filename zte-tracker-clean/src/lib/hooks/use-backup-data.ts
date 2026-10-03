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
  DetailedRoadmapTopicNote,
  OnboardingResponses,
  UserRoadmap,
  UserRoadmapProjectProgress,
  UserRoadmapTopicProgress,
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
  user_roadmaps: UserRoadmap[];
  onboarding_responses: OnboardingResponses[];
  user_roadmap_topic_progress: UserRoadmapTopicProgress[];
  roadmap_topic_notes: DetailedRoadmapTopicNote[];
  user_roadmap_project_progress: UserRoadmapProjectProgress[];
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
      enrollments,
      onboarding,
      roadmapProgress,
      roadmapNotes,
      roadmapProjects,
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
      supabase.from("user_roadmaps").select("*").eq("user_id", uid),
      supabase.from("onboarding_responses").select("*").eq("user_id", uid),
      supabase.from("user_roadmap_topic_progress").select("*").eq("user_id", uid),
      supabase.from("roadmap_topic_notes").select("*").eq("user_id", uid),
      supabase.from("user_roadmap_project_progress").select("*").eq("user_id", uid),
    ]);
    const failed = [advanced, exercises, buildInPublic, manualChecks, revision, decisions, resources, planState, activity, events, streakSummary, enrollments, onboarding, roadmapProgress, roadmapNotes, roadmapProjects].find((result) => result.error);
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
      user_roadmaps: (enrollments.data ?? []) as UserRoadmap[],
      onboarding_responses: (onboarding.data ?? []) as OnboardingResponses[],
      user_roadmap_topic_progress: (roadmapProgress.data ?? []) as UserRoadmapTopicProgress[],
      roadmap_topic_notes: (roadmapNotes.data ?? []) as DetailedRoadmapTopicNote[],
      user_roadmap_project_progress: (roadmapProjects.data ?? []) as UserRoadmapProjectProgress[],
    } satisfies BackupDomainData;
  });
}
