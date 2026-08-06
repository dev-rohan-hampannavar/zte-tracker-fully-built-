"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "zte-developer-mode";

/**
 * Local-first, mirroring useTheme's pattern: applies instantly from
 * localStorage (so the toggle feels immediate everywhere it's checked),
 * lazily syncs to user_settings.developer_mode when a user is known so the
 * preference carries across devices like every other setting does.
 *
 * The initial value comes from a lazy useState initializer (guarded for
 * SSR via typeof window) rather than a mount-time setState-in-effect —
 * this reads localStorage synchronously on first render on the client,
 * with no hydration mismatch since this hook only ever runs client-side
 * ("use client") and the guard returns the same default the server would
 * have rendered. The second effect below still syncs remote state in when
 * it arrives from Supabase, which is a legitimate external-system sync,
 * not a lint anti-pattern.
 */
export function useDeveloperMode(userId: string | undefined) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const supabase = createClient();

  const { data: remoteValue } = useSWR(
    userId ? ["developer-mode", userId] : null,
    async () => {
      const { data, error } = (await supabase
        .from("user_settings")
        .select("developer_mode")
        .eq("user_id", userId!)
        .single()) as { data: { developer_mode: boolean } | null; error: Error | null };
      if (error) throw error;
      return data?.developer_mode ?? false;
    },
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (remoteValue !== undefined && remoteValue !== enabled) {
      // Intentional: syncing local state to a value that just arrived from
      // Supabase (an external system) — see useTheme's identical pattern
      // for the full rationale.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabledState(remoteValue);
      localStorage.setItem(STORAGE_KEY, String(remoteValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteValue]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      setEnabledState(value);
      localStorage.setItem(STORAGE_KEY, String(value));
      if (userId) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: userId, developer_mode: value } as never, { onConflict: "user_id" });
      }
    },
    [userId, supabase]
  );

  return { enabled, setEnabled };
}
