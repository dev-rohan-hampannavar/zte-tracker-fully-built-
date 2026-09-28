"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingResponses, TargetRole, Phase } from "@/types/database";
import { recommendStartingPoint, dsaTargetsForLevel } from "@/lib/personalization-engine";

/**
 * Phase 6 (onboarding) + Phase 5 (enrollment) data access. Modeled on the
 * existing use-user-settings.ts conventions: a per-call createClient(),
 * SWR for reads, plain async functions for writes, `as never` on the
 * insert/update payload (matching the cast already used throughout
 * use-user-settings.ts — the generated Database["public"]["Tables"][...]
 * Insert/Update types don't always line up cleanly with a partial
 * payload built from optional form state, and this repo's established
 * pattern is to cast at the call site rather than loosen the table type
 * itself).
 */

export function useOnboardingResponses(userId: string | undefined) {
  const supabase = createClient();
  return useSWR(userId ? ["onboarding-responses", userId] : null, async () => {
    const { data, error } = await supabase
      .from("onboarding_responses")
      .select("*")
      .eq("user_id", userId!)
      .maybeSingle();
    if (error) throw error;
    return data as OnboardingResponses | null;
  });
}

export function useTargetRoles() {
  const supabase = createClient();
  return useSWR("target-roles", async () => {
    const { data, error } = await supabase.from("target_roles").select("*").eq("is_active", true).order("name");
    if (error) throw error;
    return (data ?? []) as TargetRole[];
  });
}

export type OnboardingDraft = Partial<
  Pick<
    OnboardingResponses,
    | "goal"
    | "goal_other"
    | "target_role_id"
    | "experience_level"
    | "existing_skills"
    | "weekly_hours"
    | "target_date"
    | "existing_projects_note"
    | "dsa_level"
    | "interview_readiness"
    | "career_situation"
  >
>;

/** Upserts a partial set of answers without marking onboarding complete —
 * used as the user moves between steps, so a refresh mid-flow resumes
 * where they left off instead of losing progress. */
export async function saveOnboardingDraft(userId: string, draft: OnboardingDraft) {
  const supabase = createClient();
  const { error } = await supabase
    .from("onboarding_responses")
    .upsert({ user_id: userId, ...draft } as never, { onConflict: "user_id" });
  if (error) throw error;
}

/**
 * Resolves which roadmap a user should be enrolled in, given their
 * chosen target role — a real query against role_roadmap_assignments
 * (migration 0074) rather than a hardcoded roadmap id. Falls back to
 * 'zte-core-v1' if no target role was chosen or no assignment row exists
 * for it; newly supported roles resolve to authored tracks from that catalog.
 */
async function resolveRoadmapForRole(
  supabase: ReturnType<typeof createClient>,
  targetRoleId: string | null | undefined
): Promise<string> {
  const fallback = "zte-core-v1";
  if (!targetRoleId) return fallback;
  try {
    const { data, error } = await supabase
      .from("role_roadmap_assignments")
      .select("roadmap_id")
      .eq("role_id", targetRoleId)
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback;
    return (data as { roadmap_id: string }).roadmap_id;
  } catch {
    return fallback;
  }
}

/**
 * Computes the user's personalized start point, then completes onboarding
 * and creates/updates the active enrollment in one database transaction.
 *
 * Also runs the Phase 7 personalization engine (src/lib/personalization-
 * engine.ts) to compute a starting_phase_id for the enrollment. This
 * needs `phases` (the full curriculum, order_index-sorted) and the
 * target role's required technology ids — both fetched here rather than
 * requiring the caller (the onboarding page) to have them on hand, since
 * "what phase should this enrollment start at" is an implementation
 * detail of completing onboarding, not something the UI layer should
 * need to know how to compute.
 *
 * The resolved roadmap is checked again inside the completion transaction,
 * so a stale role assignment cannot create an enrollment on the wrong track.
 */
export async function completeOnboarding(userId: string, finalAnswers: OnboardingDraft) {
  const supabase = createClient();

  const roadmapId = await resolveRoadmapForRole(supabase, finalAnswers.target_role_id);

  // A failure to compute a starting point should not block onboarding.
  let startingPhaseId: string | null = null;
  let startingDetailedPhaseId: string | null = null;
  let roadmapVersionId: string | null = null;
  let requiredTechIds: string[] = [];
  if (finalAnswers.target_role_id) {
    try {
      const { data, error } = await supabase
        .from("role_skill_requirements")
        .select("technology_id")
        .eq("role_id", finalAnswers.target_role_id);
      if (!error) requiredTechIds = (data ?? []).map((row) => (row as { technology_id: string }).technology_id);
    } catch {
      requiredTechIds = [];
    }
  }
  try {
    if (roadmapId === "zte-core-v1") {
      const { data: phases, error: phasesError } = await supabase.from("phases").select("*").order("order_index");
      if (phasesError) throw phasesError;
      const recommendation = recommendStartingPoint(
        (phases ?? []) as Phase[],
        { experience_level: finalAnswers.experience_level ?? null, existing_skills: finalAnswers.existing_skills ?? null },
        requiredTechIds
      );
      startingPhaseId = recommendation.recommendedStartPhaseId || null;
    } else {
      const { data: currentVersion, error: versionError } = await supabase
        .from("roadmap_versions")
        .select("id")
        .eq("roadmap_id", roadmapId)
        .eq("is_current", true)
        .maybeSingle();
      if (versionError) throw versionError;
      if (!currentVersion) throw new Error(`No published roadmap version found for ${roadmapId}`);
      roadmapVersionId = (currentVersion as { id: string }).id;

      const { data: phases, error: phasesError } = await supabase
        .from("roadmap_phases")
        .select("id, phase_number, title, band, description, estimated_hours, order_index")
        .eq("roadmap_id", roadmapId)
        .eq("roadmap_version_id", roadmapVersionId)
        .order("order_index");
      if (phasesError) throw phasesError;
      if (!phases?.length) throw new Error(`No curriculum phases found for ${roadmapId}`);
      const normalized = ((phases ?? []) as unknown as Array<{
        id: string;
        phase_number: string;
        title: string;
        band: string;
        description: string;
        estimated_hours: number;
        order_index: number;
      }>).map((phase) => ({
        ...phase,
        skip_build_in_public: false,
        build_in_public_prompt: null,
        exit_point_code: null,
        created_at: "",
      })) as unknown as Phase[];
      const recommendation = recommendStartingPoint(
        normalized,
        { experience_level: finalAnswers.experience_level ?? null, existing_skills: finalAnswers.existing_skills ?? null },
        requiredTechIds
      );
      startingDetailedPhaseId = recommendation.recommendedStartPhaseId || null;
    }
  } catch {
    // Missing personalization is safe for the legacy curriculum. A detailed
    // enrollment must have a valid version and phase; don't complete onboarding
    // while assigning the user to a broken or empty learning path.
    if (roadmapId !== "zte-core-v1") {
      throw new Error("This learning path is not ready yet. Please try again later or choose another role.");
    }
  }

  const { dsaEasyTarget, dsaMediumTarget } = dsaTargetsForLevel(finalAnswers.dsa_level ?? null);

  const { error } = await supabase.rpc("complete_onboarding" as never, {
    p_user_id: userId,
    p_answers: finalAnswers,
    p_roadmap_id: roadmapId,
    p_roadmap_version_id: roadmapVersionId,
    p_starting_phase_id: startingPhaseId,
    p_starting_detailed_phase_id: startingDetailedPhaseId,
    p_dsa_easy_target: dsaEasyTarget,
    p_dsa_medium_target: dsaMediumTarget,
  } as never);
  if (error) throw error;
}
