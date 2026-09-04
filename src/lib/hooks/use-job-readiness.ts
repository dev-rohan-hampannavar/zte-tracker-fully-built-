"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { TargetRole, RoleSkillRequirement } from "@/types/database";
import { computeJobReadiness, type ReadinessBreakdown } from "@/lib/job-readiness";
import { useSkillEvidence } from "@/lib/hooks/use-skills";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useCareerTracker, useInterviewRounds } from "@/lib/hooks/use-career";
import { useProjectSkills, countProjectsWithEvidence } from "@/lib/hooks/use-project-skills";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { useRoadmapMetadata } from "@/lib/hooks/use-roadmap";

const supabase = createClient();

export function useTargetRoles() {
  return useSWR("target-roles", async () => {
    const { data, error } = await supabase.from("target_roles").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as TargetRole[];
  });
}

function useRoleRequirements(roleId: string | undefined) {
  return useSWR(roleId ? ["role-requirements", roleId] : null, async () => {
    const { data, error } = await supabase.from("role_skill_requirements").select("*").eq("role_id", roleId!);
    if (error) throw error;
    return (data ?? []) as RoleSkillRequirement[];
  });
}

/**
 * Assembles every pillar's real data source and hands it to the pure
 * computeJobReadiness function. Each hook here is the SAME hook already
 * used elsewhere in the app (skills, DSA, career, project-skills) — no
 * parallel data-fetching path, so the readiness score can never disagree
 * with what those pages themselves show.
 */
export function useJobReadiness(userId: string | undefined, role: TargetRole | undefined) {
  const { data: requirements } = useRoleRequirements(role?.id);
  const { data: skillEvidence } = useSkillEvidence(userId);
  const { data: dsaProgress } = useDsaProgress(userId);
  const { data: metadata } = useRoadmapMetadata();
  const { data: applications } = useCareerTracker(userId);
  const { data: interviewRounds } = useInterviewRounds(userId);
  const { data: projectSkills } = useProjectSkills(userId);
  const { data: settings } = useUserSettings(userId);

  const ready =
    !!role && !!requirements && !!skillEvidence && !!dsaProgress && !!applications && !!interviewRounds && !!projectSkills;

  let breakdown: ReadinessBreakdown | null = null;
  if (ready) {
    const completedRounds = (interviewRounds ?? []).filter((r) => r.completed && r.result !== "cancelled");
    const passedRounds = completedRounds.filter((r) => r.result === "passed");
    const interviewPassRate = completedRounds.length === 0 ? null : Math.round((100 * passedRounds.length) / completedRounds.length);

    breakdown = computeJobReadiness({
      role: role!,
      requirements: requirements!,
      skillEvidence: skillEvidence!,
      dsaProgress: dsaProgress!,
      dsaEasyTarget: metadata?.dsa_easy_target ?? null,
      dsaMediumTarget: metadata?.dsa_medium_target ?? null,
      githubUsername: settings?.github_username ?? null,
      projectsWithEvidence: countProjectsWithEvidence(projectSkills!),
      applications: applications!,
      interviewPassRate,
    });
  }

  return { breakdown, isLoading: !ready };
}
