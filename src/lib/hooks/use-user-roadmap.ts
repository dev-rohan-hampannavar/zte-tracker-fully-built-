"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { UserRoadmap } from "@/types/database";

/**
 * The user's active roadmap enrollment (migration 0071). Split out from
 * use-onboarding.ts because this is read by parts of the app that have
 * nothing to do with onboarding itself (the dashboard's Phase 9
 * integration is the first consumer) — "which roadmap/starting point is
 * this user on" is enrollment data, not onboarding-flow data, even
 * though onboarding is what creates the row.
 *
 * Returns null (not an error) if the user has no active enrollment —
 * true for any account that predates Phase 5/6, including the existing
 * owner account per migration 0071's own comment about not inventing a
 * backfilled enrollment for them. Callers should treat null the same as
 * "no personalization recorded, behave as today" rather than as a
 * loading or error state.
 */
export function useActiveUserRoadmap(userId: string | undefined) {
  const supabase = createClient();
  return useSWR(userId ? ["active-user-roadmap", userId] : null, async () => {
    const { data, error } = await supabase
      .from("user_roadmaps")
      .select("*")
      .eq("user_id", userId!)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return data as UserRoadmap | null;
  });
}
