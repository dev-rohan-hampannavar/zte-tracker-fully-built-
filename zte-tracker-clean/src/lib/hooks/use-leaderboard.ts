"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/types/database";

const supabase = createClient();

/**
 * Public leaderboard — no auth required to read (matches the existing
 * public profile page's access model), scoped entirely by the
 * leaderboard view's own opt-in filter (public_profile_enabled = true).
 * Nothing career/job-search related is exposed here; see 0037's comment
 * for why that's a deliberate boundary, not an oversight.
 */
export function useLeaderboard(limit = 50) {
  return useSWR(["leaderboard", limit], async () => {
    const { data, error } = await supabase.from("leaderboard").select("*").limit(limit);
    if (error) throw error;
    return (data ?? []) as LeaderboardEntry[];
  });
}
