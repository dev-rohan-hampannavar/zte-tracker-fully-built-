"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/hooks/use-activity-log";
import { normalizeHttpUrl } from "@/lib/validate-url";
import type { ProjectProgress, BuildInPublicStatus, AdvancedProject, AdvancedProjectProgress } from "@/types/database";

const supabase = createClient();

export function useProjectProgress(userId: string | undefined) {
  return useSWR(userId ? ["projects", userId] : null, async () => {
    const { data, error } = await supabase
      .from("project_progress")
      .select("*")
      .eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as ProjectProgress[];
  });
}

export async function upsertProjectProgress(
  userId: string,
  phaseId: string,
  patch: Partial<ProjectProgress>,
  meta?: { prevStatus?: ProjectProgress["status"]; projectTitle?: string }
) {
  const safePatch = { ...patch } as Partial<ProjectProgress>;
  for (const field of ["github_url", "deployment_url", "demo_url"] as const) {
    if (field in safePatch) safePatch[field] = normalizeHttpUrl(safePatch[field]);
  }
  const { error } = await supabase
    .from("project_progress")
    .upsert({ user_id: userId, phase_id: phaseId, ...safePatch } as never, { onConflict: "user_id,phase_id" });
  if (error) throw error;

  // Only logs on an actual status transition the caller told us about
  // (not every patch — handleSave also carries github_url/notes/etc.
  // edits that shouldn't spam the activity feed). meta is optional so
  // non-status saves can skip it entirely.
  if (meta?.prevStatus && patch.status && patch.status !== meta.prevStatus) {
    if (patch.status === "completed") {
      await logActivity(userId, {
        action: "project_completed",
        entityType: "project_progress",
        entityId: phaseId,
        summary: meta.projectTitle ? `Completed project: ${meta.projectTitle}` : "Completed a project",
      });
    } else if (patch.status === "in_progress" && meta.prevStatus === "not_started") {
      await logActivity(userId, {
        action: "project_started",
        entityType: "project_progress",
        entityId: phaseId,
        summary: meta.projectTitle ? `Started project: ${meta.projectTitle}` : "Started a project",
      });
    }
  }
}

export function useBuildInPublicStatus(userId: string | undefined) {
  return useSWR(userId ? ["bip", userId] : null, async () => {
    const { data, error } = await supabase
      .from("build_in_public_status")
      .select("*")
      .eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as BuildInPublicStatus[];
  });
}

export async function upsertBuildInPublic(
  userId: string,
  phaseId: string,
  patch: Partial<BuildInPublicStatus>
) {
  const safePatch = { ...patch };
  if ("proof_url" in safePatch) safePatch.proof_url = normalizeHttpUrl(safePatch.proof_url);
  const { error } = await supabase
    .from("build_in_public_status")
    .upsert(
      {
        user_id: userId,
        phase_id: phaseId,
        posted_at: patch.posted ? new Date().toISOString() : null,
        ...safePatch,
      } as never,
      { onConflict: "user_id,phase_id" }
    );
  if (error) throw error;
}

// ---------- Portfolio Projects — Part VII's 10 advanced project ideas (Item 8) ----------

export function useAdvancedProjects() {
  return useSWR("advanced-projects", async () => {
    const { data, error } = await supabase.from("advanced_projects").select("*").order("order_index");
    if (error) throw error;
    return (data ?? []) as AdvancedProject[];
  });
}

export function useAdvancedProject(id: string | undefined) {
  return useSWR(id ? ["advanced-project", id] : null, async () => {
    const { data, error } = await supabase.from("advanced_projects").select("*").eq("id", id as string).single();
    if (error) throw error;
    return data as AdvancedProject;
  });
}

export function useAdvancedProjectProgress(userId: string | undefined) {
  return useSWR(userId ? ["advanced-project-progress", userId] : null, async () => {
    const { data, error } = await supabase
      .from("advanced_project_progress")
      .select("*")
      .eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as AdvancedProjectProgress[];
  });
}

export async function upsertAdvancedProjectProgress(
  userId: string,
  projectId: string,
  patch: Partial<AdvancedProjectProgress>
) {
  const safePatch = { ...patch } as Partial<AdvancedProjectProgress>;
  for (const field of ["github_url", "deployment_url"] as const) {
    if (field in safePatch) safePatch[field] = normalizeHttpUrl(safePatch[field]);
  }
  const { error } = await supabase
    .from("advanced_project_progress")
    .upsert({ user_id: userId, project_id: projectId, ...safePatch } as never, { onConflict: "user_id,project_id" });
  if (error) throw error;
}
