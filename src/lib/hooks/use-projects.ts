"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
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
  patch: Partial<ProjectProgress>
) {
  const { error } = await supabase
    .from("project_progress")
    .upsert({ user_id: userId, phase_id: phaseId, ...patch } as never, { onConflict: "user_id,phase_id" });
  if (error) throw error;
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
  const { error } = await supabase
    .from("build_in_public_status")
    .upsert(
      {
        user_id: userId,
        phase_id: phaseId,
        posted_at: patch.posted ? new Date().toISOString() : null,
        ...patch,
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
  const { error } = await supabase
    .from("advanced_project_progress")
    .upsert({ user_id: userId, project_id: projectId, ...patch } as never, { onConflict: "user_id,project_id" });
  if (error) throw error;
}
