"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { normalizeHttpUrl } from "@/lib/validate-url";
import { logActivity } from "@/lib/hooks/use-activity-log";
import type {
  CommitmentDomain,
  CommitmentStatus,
  EvidenceItem,
  EvidenceType,
  FinancialProfile,
  TimeBlock,
  TimeBlockStatus,
  TimeBlockType,
  WeeklyCommitment,
} from "@/types/database";

const supabase = createClient();

export function useWeeklyCommitments(userId: string | undefined, weekStart: string) {
  return useSWR(userId ? ["weekly-commitments", userId, weekStart] : null, async () => {
    const { data, error } = await supabase
      .from("weekly_commitments")
      .select("*")
      .eq("user_id", userId!)
      .eq("week_start", weekStart)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as WeeklyCommitment[];
  });
}

/** Full-history query used by Settings backup. The Execution OS screen uses
 * the week-scoped hook above so normal navigation stays lightweight. */
export function useAllWeeklyCommitments(userId: string | undefined) {
  return useSWR(userId ? ["weekly-commitments-all", userId] : null, async () => {
    const { data, error } = await supabase
      .from("weekly_commitments")
      .select("*")
      .eq("user_id", userId!)
      .order("week_start", { ascending: true })
      .order("order_index", { ascending: true });
    if (error) throw error;
    return (data ?? []) as WeeklyCommitment[];
  });
}

export async function createWeeklyCommitment(
  userId: string,
  input: { week_start: string; title: string; domain?: CommitmentDomain; order_index?: number }
) {
  const { data, error } = await supabase
    .from("weekly_commitments")
    .insert({ user_id: userId, title: input.title.trim(), domain: input.domain ?? "engineering", order_index: input.order_index ?? 0, week_start: input.week_start } as never)
    .select()
    .single();
  if (error) throw error;
  const commitment = data as WeeklyCommitment;
  await logActivity(userId, {
    action: "weekly_commitment_created",
    entityType: "weekly_commitment",
    entityId: commitment.id,
    summary: `Committed to: ${commitment.title} (week of ${input.week_start})`,
  });
  return commitment;
}

export async function updateWeeklyCommitment(id: string, patch: Partial<Pick<WeeklyCommitment, "title" | "domain" | "status" | "notes" | "order_index">>) {
  const safePatch = { ...patch };
  if (typeof safePatch.title === "string") safePatch.title = safePatch.title.trim();
  const { data, error } = await supabase.from("weekly_commitments").update(safePatch as never).eq("id", id).select().single();
  if (error) throw error;
  return data as WeeklyCommitment;
}

export async function deleteWeeklyCommitment(id: string) {
  const { error } = await supabase.from("weekly_commitments").delete().eq("id", id);
  if (error) throw error;
}

export function useTimeBlocks(userId: string | undefined, startDate: string, endDate: string) {
  return useSWR(userId ? ["time-blocks", userId, startDate, endDate] : null, async () => {
    const { data, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("user_id", userId!)
      .gte("block_date", startDate)
      .lte("block_date", endDate)
      .order("block_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TimeBlock[];
  });
}

/** Full-history query used by Settings backup. */
export function useAllTimeBlocks(userId: string | undefined) {
  return useSWR(userId ? ["time-blocks-all", userId] : null, async () => {
    const { data, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("user_id", userId!)
      .order("block_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TimeBlock[];
  });
}

export async function createTimeBlock(
  userId: string,
  input: Pick<TimeBlock, "block_date" | "start_time" | "end_time" | "title"> & Partial<Pick<TimeBlock, "block_type" | "topic_id" | "phase_id" | "notes">>
) {
  const { data, error } = await supabase
    .from("time_blocks")
    .insert({ user_id: userId, ...input, title: input.title.trim(), block_type: input.block_type ?? "engineering" } as never)
    .select()
    .single();
  if (error) throw error;
  return data as TimeBlock;
}

export async function updateTimeBlock(id: string, patch: Partial<Pick<TimeBlock, "block_date" | "start_time" | "end_time" | "title" | "block_type" | "status" | "topic_id" | "phase_id" | "notes">>) {
  const safePatch = { ...patch };
  if (typeof safePatch.title === "string") safePatch.title = safePatch.title.trim();
  const { data, error } = await supabase.from("time_blocks").update(safePatch as never).eq("id", id).select().single();
  if (error) throw error;
  return data as TimeBlock;
}

export async function deleteTimeBlock(id: string) {
  const { error } = await supabase.from("time_blocks").delete().eq("id", id);
  if (error) throw error;
}

export function useEvidenceItems(userId: string | undefined) {
  return useSWR(userId ? ["evidence-items", userId] : null, async () => {
    const { data, error } = await supabase
      .from("evidence_items")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as EvidenceItem[];
  });
}

export async function createEvidenceItem(
  userId: string,
  input: { title: string; evidence_type?: EvidenceType; url?: string | null; description?: string | null; tags?: string[]; topic_id?: string | null; phase_id?: string | null }
) {
  const { data, error } = await supabase
    .from("evidence_items")
    .insert({ user_id: userId, ...input, title: input.title.trim(), url: normalizeHttpUrl(input.url), evidence_type: input.evidence_type ?? "other", tags: input.tags ?? [] } as never)
    .select()
    .single();
  if (error) throw error;
  return data as EvidenceItem;
}

export async function updateEvidenceItem(id: string, patch: Partial<Pick<EvidenceItem, "title" | "evidence_type" | "url" | "description" | "tags" | "topic_id" | "phase_id">>) {
  const safePatch = { ...patch };
  if (typeof safePatch.title === "string") safePatch.title = safePatch.title.trim();
  if ("url" in safePatch) safePatch.url = normalizeHttpUrl(safePatch.url);
  const { data, error } = await supabase.from("evidence_items").update(safePatch as never).eq("id", id).select().single();
  if (error) throw error;
  return data as EvidenceItem;
}

export async function deleteEvidenceItem(id: string) {
  const { error } = await supabase.from("evidence_items").delete().eq("id", id);
  if (error) throw error;
}

const EMPTY_FINANCIAL_PROFILE = (userId: string): FinancialProfile => ({
  user_id: userId,
  monthly_income: 0,
  monthly_expenses: 0,
  savings: 0,
  emergency_months: 6,
  minimum_switch_salary: 0,
  updated_at: new Date(0).toISOString(),
});

export function useFinancialProfile(userId: string | undefined) {
  return useSWR(userId ? ["financial-profile", userId] : null, async () => {
    const { data, error } = await supabase.from("financial_profiles").select("*").eq("user_id", userId!).maybeSingle();
    if (error) throw error;
    return (data as FinancialProfile | null) ?? EMPTY_FINANCIAL_PROFILE(userId!);
  });
}

export async function saveFinancialProfile(userId: string, profile: Omit<FinancialProfile, "user_id" | "updated_at">) {
  const { data, error } = await supabase
    .from("financial_profiles")
    .upsert({ user_id: userId, ...profile } as never, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as FinancialProfile;
}

export type { CommitmentStatus, TimeBlockStatus, TimeBlockType };
