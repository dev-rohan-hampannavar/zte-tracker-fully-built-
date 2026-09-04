"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/hooks/use-activity-log";
import { normalizeHttpUrl } from "@/lib/validate-url";
import type { CareerTrackerRow, ApplicationStatus, InterviewRound, InterviewRoundType, ApplicationMetrics, ApplicationMetricsByPlan, CareerDecision } from "@/types/database";

const supabase = createClient();

export function useCareerTracker(userId: string | undefined) {
  return useSWR(userId ? ["career", userId] : null, async () => {
    const { data, error } = await supabase
      .from("career_tracker")
      .select("*")
      .eq("user_id", userId!)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerTrackerRow[];
  });
}

/** Live pipeline metrics — response/interview/offer/rejection rates,
 * always computed from the actual career_tracker rows (application_metrics
 * view), never a cached percentage that could drift. */
export function useApplicationMetrics(userId: string | undefined) {
  return useSWR(userId ? ["application-metrics", userId] : null, async () => {
    const { data, error } = await supabase
      .from("application_metrics")
      .select("*")
      .eq("user_id", userId!)
      .maybeSingle();
    if (error) throw error;
    return (
      (data as ApplicationMetrics | null) ?? {
        user_id: userId!,
        total_applications: 0,
        active_applications: 0,
        responded_applications: 0,
        past_applied_count: 0,
        reached_interview_count: 0,
        offer_count: 0,
        rejected_count: 0,
        response_rate_pct: 0,
        interview_rate_pct: 0,
        offer_rate_pct: 0,
        rejection_rate_pct: 0,
      }
    );
  });
}

/** All interview rounds across every application for this user, most
 * recently scheduled first — backs the Interviews page. */
export function useInterviewRounds(userId: string | undefined) {
  return useSWR(userId ? ["interview-rounds", userId] : null, async () => {
    const { data, error } = await supabase
      .from("interview_rounds")
      .select("*")
      .eq("user_id", userId!)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as InterviewRound[];
  });
}

export async function upsertCareerEntry(
  userId: string,
  entry: Partial<CareerTrackerRow> & { company: string },
  previous?: CareerTrackerRow
) {
  const safeEntry = { ...entry } as Partial<CareerTrackerRow> & { company: string };
  if ("job_url" in safeEntry) safeEntry.job_url = normalizeHttpUrl(safeEntry.job_url);
  const { error } = await supabase.from("career_tracker").upsert({
    user_id: userId,
    ...safeEntry,
  } as never);
  if (error) throw error;

  if (!previous) {
    await logActivity(userId, {
      action: "application_created",
      entityType: "career_tracker",
      entityId: entry.id ?? entry.company,
      summary: `Added application: ${entry.company}`,
    });
  } else if (previous.application_status !== entry.application_status) {
    await logActivity(userId, {
      action: "application_status_changed",
      entityType: "career_tracker",
      entityId: previous.id,
      summary: `${entry.company}: ${previous.application_status} → ${entry.application_status}`,
      undoPayload: { field: "application_status", value: previous.application_status },
    });
  }
}

/** Deletes an application, logging the full row as undo_payload so
 * undoApplicationDelete() below can re-insert it exactly as it was. */
export async function deleteCareerEntry(userId: string, entry: CareerTrackerRow) {
  const { error } = await supabase.from("career_tracker").delete().eq("id", entry.id);
  if (error) throw error;
  await logActivity(userId, {
    action: "application_deleted",
    entityType: "career_tracker",
    entityId: entry.id,
    summary: `Deleted application: ${entry.company}`,
    undoPayload: entry as unknown as Record<string, unknown>,
  });
}

/** Reverses an application_deleted activity log entry by re-inserting the
 * stored row. Only called from the Activity History page's Undo button. */
export async function undoApplicationDelete(row: CareerTrackerRow) {
  const { error } = await supabase.from("career_tracker").insert(row as never);
  if (error) throw error;
}

/** Reverses an application_status_changed entry by restoring the previous
 * status directly. */
export async function undoApplicationStatusChange(applicationId: string, previousStatus: ApplicationStatus) {
  const { error } = await supabase
    .from("career_tracker")
    .update({ application_status: previousStatus } as never)
    .eq("id", applicationId);
  if (error) throw error;
}

export async function createInterviewRound(
  userId: string,
  applicationId: string,
  round: { round_type: InterviewRoundType; scheduled_at?: string | null; order_index?: number; notes?: string }
) {
  const { data, error } = await supabase
    .from("interview_rounds")
    .insert({ user_id: userId, application_id: applicationId, ...round } as never)
    .select()
    .single();
  if (error) throw error;
  return data as InterviewRound;
}

export async function updateInterviewRound(id: string, patch: Partial<InterviewRound>) {
  const { error } = await supabase.from("interview_rounds").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteInterviewRound(id: string) {
  const { error } = await supabase.from("interview_rounds").delete().eq("id", id);
  if (error) throw error;
}

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const INTERVIEW_ROUND_TYPES: { value: InterviewRoundType; label: string }[] = [
  { value: "oa", label: "Online Assessment" },
  { value: "recruiter_screen", label: "Recruiter Screen" },
  { value: "technical", label: "Technical" },
  { value: "system_design", label: "System Design" },
  { value: "behavioral", label: "Behavioral" },
  { value: "hr", label: "HR" },
  { value: "final", label: "Final" },
  { value: "other", label: "Other" },
];

export function useApplicationMetricsByPlan(userId: string | undefined) {
  return useSWR(userId ? ["application-metrics-by-plan", userId] : null, async () => {
    const { data, error } = await supabase
      .from("application_metrics_by_plan")
      .select("*")
      .eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as ApplicationMetricsByPlan[];
  });
}

/** Updates which career-plan fork (Plan A / Operations fallback, or Plan
 * B / SDE) a single application belongs to. User-set only — never
 * inferred from role/company text. */
export async function updateApplicationPlan(applicationId: string, careerPlan: "plan_a" | "plan_b") {
  const { error } = await supabase
    .from("career_tracker")
    .update({ career_plan: careerPlan } as never)
    .eq("id", applicationId);
  if (error) throw error;
}

/** Persists a Month-24 evidence-check acknowledgment so repeated deferral
 * ("endless Plan B") can be detected from real history instead of guessed. */
export async function logCareerDecision(
  userId: string,
  decision: "go" | "no-go" | "insufficient-evidence",
  actionTaken: "accepted_go" | "accepted_no_go" | "deferred",
  snapshot: Record<string, unknown>
) {
  const { error } = await supabase.from("career_decisions").insert({
    user_id: userId,
    decision,
    action_taken: actionTaken,
    snapshot,
  } as never);
  if (error) throw error;
}

export function useCareerDecisions(userId: string | undefined) {
  return useSWR(userId ? ["career-decisions", userId] : null, async () => {
    const { data, error } = await supabase
      .from("career_decisions")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerDecision[];
  });
}
