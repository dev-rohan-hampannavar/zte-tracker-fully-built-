"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { ProjectSkill } from "@/types/database";

const supabase = createClient();

export function useProjectSkills(userId: string | undefined) {
  return useSWR(userId ? ["project-skills", userId] : null, async () => {
    const { data, error } = await supabase.from("project_skills").select("*").eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as ProjectSkill[];
  });
}

export async function addProjectSkill(
  userId: string,
  params: { phaseId?: string; advancedProjectId?: string; technologyId: string }
) {
  const { error } = await supabase.from("project_skills").insert({
    user_id: userId,
    phase_id: params.phaseId ?? null,
    advanced_project_id: params.advancedProjectId ?? null,
    technology_id: params.technologyId,
  } as never);
  if (error) throw error;
}

export async function removeProjectSkill(id: string) {
  const { error } = await supabase.from("project_skills").delete().eq("id", id);
  if (error) throw error;
}

/** Count of distinct projects (across both systems) that have at least
 * one confirmed skill link — used as a readiness input. */
export function countProjectsWithEvidence(projectSkills: ProjectSkill[]): number {
  const ids = new Set(projectSkills.map((ps) => ps.phase_id ?? ps.advanced_project_id));
  return ids.size;
}
