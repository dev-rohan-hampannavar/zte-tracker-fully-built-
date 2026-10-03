"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import type { UserSettings } from "@/types/database";

const supabase = createClient();

// Item 20 — cross-device continuity nudge. Data already syncs cross-device
// via Supabase; what was missing was ever writing to (or reading from)
// user_settings.last_opened_page / last_opened_phase, which have existed
// on the table since migration 0001 but were never touched by the app.
// This hook is the write side: call it once near the root of the
// authenticated app so every route change records where the person was.
const TRACKED_PREFIXES = [
  "/roadmap/topic/",
  "/projects",
  "/dsa",
  "/career",
  "/goals",
  "/daily-plan",
  "/revision",
  "/exit-ladder",
  "/clientsync",
] as const;

function labelForPath(pathname: string): string | null {
  if (pathname.startsWith("/roadmap/topic/")) return "a roadmap topic";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/dsa")) return "DSA practice";
  if (pathname.startsWith("/career")) return "Career tracker";
  if (pathname.startsWith("/goals")) return "Goals";
  if (pathname.startsWith("/daily-plan")) return "your daily plan";
  if (pathname.startsWith("/revision")) return "Revision";
  if (pathname.startsWith("/exit-ladder")) return "the Exit Ladder";
  if (pathname.startsWith("/clientsync")) return "ClientSync";
  return null;
}

/** Records the current route as "last opened" whenever it changes, for
 * a small set of substantive pages (not every settings/notification
 * click) — mirrors how last_expanded_accordion only tracks meaningful
 * roadmap state, not every UI toggle. Fire-and-forget: a failed write
 * here shouldn't surface an error to the person mid-navigation. */
export function useTrackLastOpenedPage(userId: string | undefined) {
  const pathname = usePathname();
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !pathname) return;
    if (!TRACKED_PREFIXES.some((p) => pathname.startsWith(p))) return;
    if (lastWritten.current === pathname) return;
    lastWritten.current = pathname;

    const topicMatch = pathname.match(/^\/roadmap\/topic\/([^/]+)/);

    supabase
      .from("user_settings")
      .update({
        last_opened_page: pathname,
        last_opened_phase: topicMatch ? topicMatch[1] : null,
      } as never)
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) lastWritten.current = null; // allow retry on next nav
      });
  }, [userId, pathname]);
}

export interface ContinuityNudge {
  label: string;
  href: string;
}

const RESUME_MINUTES_MIN = 5; // below this it's just the page they're already on

/** Read side: resolves settings into a "pick up where you left off" nudge,
 * suppressed when the person is already on that page (same session) or
 * when the last-opened page was set less than RESUME_MINUTES_MIN ago
 * (too recent to be a meaningful "you left off here" — more likely mid-session). */
export function resolveContinuityNudge(
  settings: UserSettings | undefined,
  currentPathname: string | null,
  updatedAt: string | undefined
): ContinuityNudge | null {
  if (!settings?.last_opened_page) return null;
  if (currentPathname && settings.last_opened_page === currentPathname) return null;
  if (updatedAt) {
    const minutesSince = (Date.now() - new Date(updatedAt).getTime()) / 60000;
    if (minutesSince < RESUME_MINUTES_MIN) return null;
  }
  const label = labelForPath(settings.last_opened_page);
  if (!label) return null;
  return { label, href: settings.last_opened_page };
}

export function useContinuityNudge(userId: string | undefined) {
  const { data: settings } = useUserSettings(userId);
  const pathname = usePathname();
  return resolveContinuityNudge(settings, pathname, settings?.updated_at);
}
