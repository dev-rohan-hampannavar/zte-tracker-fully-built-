"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

/**
 * Fetches just user_settings.display_name. Kept separate from the fuller
 * settings hook in the Settings page so callers that only need the name
 * (e.g. certificate generation) don't pull in the rest of that record.
 */
export function useDisplayName(userId: string | undefined) {
  const supabase = createClient();
  return useSWR(userId ? ["display-name", userId] : null, async () => {
    const { data, error } = await supabase
      .from("user_settings")
      .select("display_name")
      .eq("user_id", userId!)
      .single();
    if (error) return null;
    return (data as { display_name: string | null } | null)?.display_name ?? null;
  });
}
