"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/hooks/use-activity-log";
import type { SkillEvidence, SkillFreshness, SkillFreshnessState, UserSkill } from "@/types/database";

const supabase = createClient();

export interface SkillWithFreshness extends SkillEvidence {
  freshness: SkillFreshnessState;
  last_activity_at: string | null;
}

/**
 * Per-technology evidence + freshness, joined client-side (two cheap view
 * reads). Every number here is computed server-side from real
 * topic_progress/topic_technologies rows — see skill_evidence /
 * skill_freshness views (0032). No client-side score fabrication.
 */
export function useSkillEvidence(userId: string | undefined) {
  return useSWR(userId ? ["skill-evidence", userId] : null, async () => {
    const [{ data: evidence, error: evidenceError }, { data: freshness, error: freshnessError }] =
      await Promise.all([
        supabase.from("skill_evidence").select("*").eq("user_id", userId!),
        supabase.from("skill_freshness").select("*").eq("user_id", userId!),
      ]);
    if (evidenceError) throw evidenceError;
    if (freshnessError) throw freshnessError;

    const freshnessMap = new Map((freshness as SkillFreshness[] | null ?? []).map((f) => [f.technology_id, f]));

    return ((evidence as SkillEvidence[] | null) ?? [])
      .map((e): SkillWithFreshness => ({
        ...e,
        freshness: freshnessMap.get(e.technology_id)?.freshness ?? "never",
        last_activity_at: freshnessMap.get(e.technology_id)?.last_activity_at ?? null,
      }))
      .sort((a, b) => b.knowledge_pct - a.knowledge_pct);
  });
}

export function useUserSkills(userId: string | undefined) {
  return useSWR(userId ? ["user-skills", userId] : null, async () => {
    const { data, error } = await supabase
      .from("user_skills")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as UserSkill[];
  });
}

export async function addUserSkill(
  userId: string,
  skill: { technology_id?: string | null; custom_name?: string | null; notes?: string }
) {
  const { data, error } = await supabase
    .from("user_skills")
    .insert({ user_id: userId, ...skill } as never)
    .select()
    .single();
  if (error) throw error;
  const row = data as UserSkill;
  await logActivity(userId, {
    action: "skill_added",
    entityType: "user_skill",
    entityId: row.id,
    summary: `Added skill: ${skill.custom_name ?? skill.technology_id}`,
    undoPayload: row as unknown as Record<string, unknown>,
  });
  return row;
}

export async function removeUserSkill(userId: string, skill: UserSkill) {
  const { error } = await supabase.from("user_skills").delete().eq("id", skill.id);
  if (error) throw error;
  await logActivity(userId, {
    action: "skill_removed",
    entityType: "user_skill",
    entityId: skill.id,
    summary: `Removed skill: ${skill.custom_name ?? skill.technology_id}`,
    undoPayload: skill as unknown as Record<string, unknown>,
  });
}

/** Reverses a skill_removed activity log entry by re-inserting it. */
export async function undoSkillRemove(skill: UserSkill) {
  const { error } = await supabase.from("user_skills").insert(skill as never);
  if (error) throw error;
}

export const FRESHNESS_LABELS: Record<SkillFreshnessState, string> = {
  fresh: "Fresh",
  aging: "Aging",
  stale: "Stale — needs revision",
  never: "Not started",
};

export const FRESHNESS_VARIANT: Record<SkillFreshnessState, "success" | "warning" | "danger" | "outline"> = {
  fresh: "success",
  aging: "warning",
  stale: "danger",
  never: "outline",
};
