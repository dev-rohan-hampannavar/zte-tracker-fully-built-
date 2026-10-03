"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/hooks/use-activity-log";
import { normalizeHttpUrl } from "@/lib/validate-url";
import type { DsaProgressRow, Difficulty, RevisionStatus } from "@/types/database";
import type { ConfidenceRating } from "@/lib/revision-schedule";
import { computeNextReviewDueForRating, nextReviewCountForRating, tierForReviewCount } from "@/lib/revision-schedule";

const supabase = createClient();

export function useDsaProgress(userId: string | undefined) {
  return useSWR(userId ? ["dsa", userId] : null, async () => {
    const { data, error } = await supabase
      .from("dsa_progress")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as DsaProgressRow[];
  });
}

export async function addDsaProblem(
  userId: string,
  problem: { problem_name: string; difficulty: Difficulty; topic_tag?: string; url?: string; pattern?: string }
) {
  const safeProblem = { ...problem, url: normalizeHttpUrl(problem.url) };
  const { error } = await supabase.from("dsa_progress").insert({
    user_id: userId,
    ...safeProblem,
  } as never);
  if (error) throw error;
}

export async function toggleDsaComplete(
  id: string,
  completed: boolean,
  userId?: string,
  problemName?: string
) {
  const { error } = await supabase
    .from("dsa_progress")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null } as never)
    .eq("id", id);
  if (error) throw error;

  // userId is optional here (not every call site necessarily has it handy,
  // matching how toggleTopicComplete's title param is also optional) but
  // the one real call site (the DSA page) always has it, since the page
  // needs it for useDsaProgress in the first place. Only logs on marking
  // solved, not un-marking — mirrors the topic_completed convention.
  if (completed && userId) {
    await logActivity(userId, {
      action: "dsa_problem_solved",
      entityType: "dsa_progress",
      entityId: id,
      summary: problemName ? `Solved: ${problemName}` : "Solved a DSA problem",
    });
  }
}

export async function deleteDsaProblem(id: string) {
  const { error } = await supabase.from("dsa_progress").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Records the full evidence for a solve attempt — Phase 3's DSA
 * Intelligence fields. Distinct from toggleDsaComplete (which stays as
 * the quick single-click "mark solved" path with no extra data entry
 * required — not every problem needs a detailed log). This is the
 * richer path used from the solve-detail flow.
 */
export async function logDsaAttempt(
  id: string,
  userId: string,
  problemName: string,
  data: {
    attempts?: number;
    timeTakenMinutes?: number;
    hintsUsed?: number;
    solutionViewed?: boolean;
    mistakes?: string;
    markSolved: boolean;
  }
) {
  const { error } = await supabase
    .from("dsa_progress")
    .update({
      attempts: data.attempts,
      time_taken_minutes: data.timeTakenMinutes,
      hints_used: data.hintsUsed,
      solution_viewed: data.solutionViewed,
      mistakes: data.mistakes || null,
      completed: data.markSolved,
      completed_at: data.markSolved ? new Date().toISOString() : null,
    } as never)
    .eq("id", id);
  if (error) throw error;

  if (data.markSolved) {
    await logActivity(userId, {
      action: "dsa_problem_solved",
      entityType: "dsa_progress",
      entityId: id,
      summary: `Solved: ${problemName}`,
    });
  }
}

/**
 * Rates confidence on a solved problem and schedules its next review —
 * reuses the exact same interval math as topic revision
 * (revision-schedule.ts) so "how well do I actually know this" behaves
 * identically whether it's a roadmap topic or a DSA problem, rather than
 * inventing a second scheduling algorithm.
 */
export async function rateDsaConfidence(id: string, currentReviewCount: number, rating: ConfidenceRating) {
  const newCount = nextReviewCountForRating(currentReviewCount, rating);
  const tier = tierForReviewCount(newCount);
  const revisionStatus: RevisionStatus = tier === "mastered" ? "mastered" : rating <= 2 ? "needs_revision" : "comfortable";

  const { error } = await supabase
    .from("dsa_progress")
    .update({
      confidence: rating,
      revision_status: revisionStatus,
      review_count: newCount,
      next_review_due: computeNextReviewDueForRating(newCount, rating),
      last_reviewed_at: new Date().toISOString(),
    } as never)
    .eq("id", id);
  if (error) throw error;
}
