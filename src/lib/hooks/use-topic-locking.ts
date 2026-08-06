"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "zte-topic-locking-disabled";

/**
 * Stage 3 — Item 34: Prerequisite Locking — topic level.
 *
 * Persisted "Disable topic locking" override for advanced users, following
 * the exact same local-first / lazily-synced pattern as useDeveloperMode
 * (see that hook's comment for the full rationale on why this shape is
 * correct despite the setState-in-effect look of it). Kept as its own
 * dedicated hook rather than folded into useUserSettings so call sites that
 * only care about this one flag — the roadmap page, the topic detail page —
 * don't need to pull in the whole settings row.
 *
 * This is a separate, persisted setting from the existing `unlockedOverride`
 * local state on the roadmap page, which is a per-session "unlock this one
 * locked phase for now" click and was never meant to be a global toggle.
 * This hook is the actual "Disable topic locking" switch the plan asks for.
 */
export function useTopicLockingDisabled(userId: string | undefined) {
  // Lazy initializer reads localStorage synchronously on first render —
  // see useTheme's identical pattern for the full rationale.
  const [disabled, setDisabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const supabase = createClient();

  const { data: remoteValue } = useSWR(
    userId ? ["topic-locking-disabled", userId] : null,
    async () => {
      const { data, error } = (await supabase
        .from("user_settings")
        .select("topic_locking_disabled")
        .eq("user_id", userId!)
        .single()) as { data: { topic_locking_disabled: boolean } | null; error: Error | null };
      if (error) throw error;
      return data?.topic_locking_disabled ?? false;
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (remoteValue !== undefined && remoteValue !== disabled) {
      // Intentional: syncing local state to a value that just arrived from
      // Supabase (an external system) — see useTheme's identical pattern
      // for the full rationale.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisabledState(remoteValue);
      localStorage.setItem(STORAGE_KEY, String(remoteValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteValue]);

  const setDisabled = useCallback(
    async (value: boolean) => {
      setDisabledState(value);
      localStorage.setItem(STORAGE_KEY, String(value));
      if (userId) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: userId, topic_locking_disabled: value } as never, { onConflict: "user_id" });
      }
    },
    [userId, supabase]
  );

  return { disabled, setDisabled };
}
