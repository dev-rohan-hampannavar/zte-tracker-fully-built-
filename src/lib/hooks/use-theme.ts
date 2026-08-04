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
  const [theme, setThemeState] = useState<ThemePreference>("system");
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

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "system";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    if (remoteTheme && remoteTheme !== theme) {
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
