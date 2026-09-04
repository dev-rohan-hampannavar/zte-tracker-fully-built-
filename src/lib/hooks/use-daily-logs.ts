"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { DailyLog } from "@/types/database";
import { todayISO, localDateISO } from "@/lib/utils";

const supabase = createClient();

export function useDailyLogs(userId: string | undefined) {
  return useSWR(userId ? ["daily-logs", userId] : null, async () => {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", userId!)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as DailyLog[];
  });
}

export async function logStudySession(hours: number, note?: string) {
  // Delegates to a SECURITY DEFINER RPC (migration 0028) that does the
  // read-and-increment atomically inside a single SQL statement, instead
  // of the previous select-then-upsert here in JS. That round trip had a
  // real race: two concurrent calls (a double-click, or two tabs open)
  // could both read the same starting `hours` before either wrote back,
  // silently dropping one session's logged hours from the day's total —
  // which then silently under-counted streak/heatmap/weekly-hours too,
  // since those are all derived from this same row. The function scopes
  // writes to auth.uid() itself (same as reset_user_progress/
  // delete_own_account), so a userId parameter is no longer needed here.
  const supabase = createClient();
  const { error } = await supabase.rpc(
    "log_study_session_hours" as never,
    { p_date: todayISO(), p_hours: hours, p_note: note || null } as never
  );
  if (error) throw error;
}

/**
 * Journal fields (learned/mistakes/wins/tomorrow_goal) are a single daily
 * reflection, not something that accumulates across multiple sessions the
 * way hours do — so this overwrites rather than appends, unlike
 * logStudySession's additive note behavior. Defaults to today; callers can
 * pass a specific date to edit a past entry.
 */
export async function saveJournalEntry(
  userId: string,
  entry: { learned?: string; mistakes?: string; wins?: string; tomorrow_goal?: string; day_job_hours?: number | null },
  date: string = todayISO()
) {
  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: userId,
      date,
      learned: entry.learned || null,
      mistakes: entry.mistakes || null,
      wins: entry.wins || null,
      tomorrow_goal: entry.tomorrow_goal || null,
      day_job_hours: entry.day_job_hours ?? null,
    } as never,
    { onConflict: "user_id,date" }
  );
  if (error) throw error;
}

export function computeStreak(logs: DailyLog[]): { current: number; best: number } {
  if (!logs.length) return { current: 0, best: 0 };

  const dates = new Set(logs.filter((l) => l.hours > 0).map((l) => l.date));
  const sorted = [...dates].sort();

  let best = 0;
  let run = 0;
  let prev: Date | null = null;

  for (const d of sorted) {
    const cur = new Date(d + "T00:00:00");
    if (prev) {
      const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = cur;
  }

  // Current streak: walk backward from today/yesterday. Uses localDateISO,
  // not toISOString(), so the day boundary matches the user's own calendar
  // day rather than UTC's — otherwise users west of UTC could show as
  // "missed today" while it's still today for them (see todayISO comment
  // in utils.ts for the same underlying bug).
  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // allow "today not logged yet" to not break the streak
  if (!dates.has(localDateISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(localDateISO(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, best };
}

/**
 * Upserts the public-safe streak summary (current/best streak, total days
 * logged — no journal content) so the public profile page can show a
 * consistency signal without needing any public access to daily_logs
 * itself. Called from Dashboard whenever logs change; cheap enough to run
 * on every load since it's a single-row upsert, not worth debouncing.
 */
export async function syncPublicStreakSummary(userId: string, logs: DailyLog[], phasesCompleted?: number) {
  const { current, best } = computeStreak(logs);
  const totalDaysLogged = logs.filter((l) => l.hours > 0).length;
  const payload: Record<string, unknown> = {
    user_id: userId,
    current_streak: current,
    best_streak: best,
    total_days_logged: totalDaysLogged,
    updated_at: new Date().toISOString(),
  };
  // Only include phases_completed when the caller actually has it —
  // callers that don't track phase completion (or haven't loaded it yet)
  // shouldn't accidentally zero out a previously-synced value.
  if (phasesCompleted !== undefined) payload.phases_completed = phasesCompleted;
  const { error } = await supabase.from("public_streak_summary").upsert(payload as never, { onConflict: "user_id" });
  // Non-critical — the public profile just shows a stale/absent streak
  // until the next successful sync, nothing in the main app depends on
  // this succeeding, so a failure here shouldn't surface as an error toast.
  if (error) console.error("Failed to sync public streak summary:", error);
}

export function weeklyHours(logs: DailyLog[]): number {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  // localDateISO, not toISOString() — UTC conversion could shift this
  // boundary by a day for timezones behind UTC, silently over/under-
  // counting a day's logged hours in the "this week" total on Dashboard.
  const weekAgoISO = localDateISO(weekAgo);
  return logs
    .filter((l) => l.date >= weekAgoISO)
    .reduce((sum, l) => sum + Number(l.hours), 0);
}

/**
 * Buckets every logged day into calendar weeks (Monday-start, ISO-ish —
 * not true ISO week numbering, just a consistent 7-day bucket anchored to
 * Monday) and sums hours per week, chronological order. Used for velocity
 * (is the weekly pace trending up or down) and "best week" (the single
 * highest-hours week) — both derived straight from real daily_logs rows,
 * nothing inferred or estimated.
 */
export function weeklyBreakdown(logs: DailyLog[]): { weekStart: string; hours: number }[] {
  const buckets = new Map<string, number>();
  for (const l of logs) {
    const d = new Date(l.date + "T00:00:00");
    const day = d.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);
    const key = localDateISO(monday);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(l.hours));
  }
  return Array.from(buckets.entries())
    .map(([weekStart, hours]) => ({ weekStart, hours }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}
