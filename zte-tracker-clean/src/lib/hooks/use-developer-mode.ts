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
 * The two effects below read localStorage synchronously on mount and sync
 * remote state in — the same "setState in an effect" shape flagged as an
 * anti-pattern elsewhere in this codebase (and fixed properly in the
 * Journal page, P7.5), but here it's the correct tool: localStorage isn't
 * available during server rendering, so there is no way to read it during
 * render itself without an SSR/hydration mismatch. useTheme has the
 * identical shape for the identical reason. A keyed-remount alternative
 * (like the Journal fix) doesn't apply here — there's no fetched row to
 * key on until the user is known, and the whole point is showing the
 * locally-cached value before that fetch resolves.
 */
export function useDeveloperMode(userId: string | undefined) {
  const [enabled, setEnabledState] = useState(false);
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
    const stored = localStorage.getItem(STORAGE_KEY) === "true";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see doc comment above; localStorage is unavailable during SSR, so this can't move to a useState initializer without a hydration mismatch
    setEnabledState(stored);
  }, []);

  useEffect(() => {
    if (remoteValue !== undefined && remoteValue !== enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external (SWR) state in, the documented correct case per the rule's own guidance
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
