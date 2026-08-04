"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { DsaProgressRow, Difficulty } from "@/types/database";

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
  problem: { problem_name: string; difficulty: Difficulty; topic_tag?: string; url?: string }
) {
  const { error } = await supabase.from("dsa_progress").insert({
    user_id: userId,
    ...problem,
  } as never);
  if (error) throw error;
}

export async function toggleDsaComplete(id: string, completed: boolean) {
  const { error } = await supabase
    .from("dsa_progress")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDsaProblem(id: string) {
  const { error } = await supabase.from("dsa_progress").delete().eq("id", id);
  if (error) throw error;
}
