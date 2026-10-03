"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

export function useFeatureFlag(key: string | undefined, fallback = true) {
  return useSWR(key ? ["feature-flag", key] : null, async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("feature_flags").select("enabled").eq("key", key as string).maybeSingle();
    if (error) throw error;
    return (data as { enabled: boolean } | null)?.enabled ?? fallback;
  }, { shouldRetryOnError: false, revalidateOnFocus: false });
}
