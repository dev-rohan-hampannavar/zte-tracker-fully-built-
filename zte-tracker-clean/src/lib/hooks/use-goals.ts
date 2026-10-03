"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/hooks/use-activity-log";
import type {
  Goal,
  GoalPriority,
  GoalWithMilestones,
  Milestone,
  MilestoneStatus,
} from "@/types/database";

const supabase = createClient();

/**
 * Goals joined with their milestones and a live progress percentage.
 * Progress is always derived from milestone completion counts (see
 * goal_progress view / complete_milestone RPC) — never a stored/cached
 * number that could drift from what's actually completed.
 */
export function useGoals(userId: string | undefined) {
  return useSWR(userId ? ["goals", userId] : null, async () => {
    const [{ data: goals, error: goalsError }, { data: milestones, error: milestonesError }] =
      await Promise.all([
        supabase.from("goals").select("*").eq("user_id", userId!).order("created_at", { ascending: false }),
        supabase.from("milestones").select("*").eq("user_id", userId!).order("order_index", { ascending: true }),
      ]);
    if (goalsError) throw goalsError;
    if (milestonesError) throw milestonesError;

    const byGoal = new Map<string, Milestone[]>();
    for (const m of (milestones ?? []) as Milestone[]) {
      const list = byGoal.get(m.goal_id) ?? [];
      list.push(m);
      byGoal.set(m.goal_id, list);
    }

    return ((goals ?? []) as Goal[]).map((g): GoalWithMilestones => {
      const ms = byGoal.get(g.id) ?? [];
      const completed = ms.filter((m) => m.status === "completed").length;
      const progress_pct = ms.length === 0 ? 0 : Math.round((100 * completed) / ms.length);
      return { ...g, milestones: ms, progress_pct };
    });
  });
}

export async function createGoal(
  userId: string,
  goal: { title: string; description?: string; category?: string; priority?: GoalPriority; target_date?: string | null }
) {
  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: userId, ...goal } as never)
    .select()
    .single();
  if (error) throw error;
  await logActivity(userId, {
    action: "goal_created",
    entityType: "goal",
    entityId: (data as Goal).id,
    summary: `Created goal: ${goal.title}`,
  });
  return data as Goal;
}

export async function updateGoal(goalId: string, patch: Partial<Goal>) {
  const { error } = await supabase.from("goals").update(patch as never).eq("id", goalId);
  if (error) throw error;
}

export async function deleteGoal(goalId: string) {
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw error;
}

export async function createMilestone(
  userId: string,
  goalId: string,
  milestone: {
    title: string;
    description?: string;
    deadline?: string | null;
    order_index?: number;
    linked_topic_id?: string | null;
    linked_stage_project_id?: string | null;
    linked_advanced_project_id?: string | null;
    linked_skill_slugs?: string[];
  }
) {
  const { data, error } = await supabase
    .from("milestones")
    .insert({ user_id: userId, goal_id: goalId, ...milestone } as never)
    .select()
    .single();
  if (error) throw error;
  return data as Milestone;
}

export async function updateMilestone(milestoneId: string, patch: Partial<Milestone>) {
  const { error } = await supabase.from("milestones").update(patch as never).eq("id", milestoneId);
  if (error) throw error;
}

export async function deleteMilestone(milestoneId: string) {
  const { error } = await supabase.from("milestones").delete().eq("id", milestoneId);
  if (error) throw error;
}

/**
 * Marks a milestone completed via the atomic complete_milestone() RPC
 * (server-side), which also cascades the parent goal to "completed" if
 * this was the last open milestone — avoiding a client-side
 * read-then-write race across two calls. Logs to activity_log using the
 * title the caller already has in hand (avoids a redundant fetch just to
 * write a human-readable summary).
 */
export async function completeMilestone(userId: string, milestone: Milestone) {
  const { error } = await supabase.rpc(
    "complete_milestone" as never,
    { p_milestone_id: milestone.id } as never
  );
  if (error) throw error;
  await logActivity(userId, {
    action: "milestone_completed",
    entityType: "milestone",
    entityId: milestone.id,
    summary: `Completed milestone: ${milestone.title}`,
  });
}

/** For statuses other than "completed" (which goes through the RPC above). */
export async function setMilestoneStatus(milestoneId: string, status: Exclude<MilestoneStatus, "completed">) {
  const { error } = await supabase
    .from("milestones")
    .update({ status } as never)
    .eq("id", milestoneId);
  if (error) throw error;
}

export const GOAL_PRIORITIES: { value: GoalPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const MILESTONE_STATUSES: { value: MilestoneStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];
