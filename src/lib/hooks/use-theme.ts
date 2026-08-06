"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "zte-theme";

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  const resolved =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Local-first theme control. Applies instantly via localStorage (no flash),
 * and lazily syncs the preference to user_settings.theme when a user is known.
 */
export function useTheme(userId: string | undefined) {
  // Lazy initializer reads localStorage synchronously on first render,
  // instead of defaulting to "system" and then correcting via a
  // setState-in-effect on mount — avoids the extra render entirely rather
  // than just working around the lint rule. Guarded for SSR: localStorage
  // isn't available server-side, and this file only runs client-side
  // ("use client") but Next may still evaluate the initializer during an
  // initial server render pass in some configurations.
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "system";
  });
  const supabase = createClient();

  const { data: remoteTheme } = useSWR(
    userId ? ["theme", userId] : null,
    async () => {
      const { data, error } = (await supabase
        .from("user_settings")
        .select("theme")
        .eq("user_id", userId!)
        .single()) as { data: { theme: ThemePreference } | null; error: Error | null };
      if (error) throw error;
      return data?.theme ?? "system";
    },
    { revalidateOnFocus: false }
  );

  // Apply the initial theme to the DOM once on mount. This is a one-way
  // sync to an external system (document.documentElement), not a setState
  // call, so it doesn't trigger the same lint rule the old version did.
  useEffect(() => {
    applyTheme(theme);
    // Only on mount — subsequent theme changes are applied directly at
    // the call site (setTheme below) or by the remote-sync effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (remoteTheme && remoteTheme !== theme) {
      // Intentional: syncing local theme state to the value that just
      // arrived from Supabase (an external system) is exactly the
      // "subscribe for updates from an external system" case the
      // set-state-in-effect rule carves out as acceptable — remoteTheme
      // only changes when SWR's async fetch resolves, not on every render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(remoteTheme);
      applyTheme(remoteTheme);
      localStorage.setItem(STORAGE_KEY, remoteTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback(
    async (pref: ThemePreference) => {
      setThemeState(pref);
      applyTheme(pref);
      localStorage.setItem(STORAGE_KEY, pref);
      if (userId) {
        await supabase
          .from("user_settings")
          .upsert({ user_id: userId, theme: pref } as never, { onConflict: "user_id" });
      }
    },
    [userId, supabase]
  );

  return { theme, setTheme };
}
