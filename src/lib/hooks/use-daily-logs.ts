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

export async function logStudySession(userId: string, hours: number, note?: string) {
  const date = todayISO();
  // Additive: if today already has a log, add to it rather than overwrite,
  // so users can log multiple sessions across the day.
  const { data: existing } = await supabase
    .from("daily_logs")
    .select("hours,note")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle() as { data: { hours: number; note: string | null } | null };

  const newHours = (existing?.hours ?? 0) + hours;
  const newNote = [existing?.note, note].filter(Boolean).join(" · ") || null;

  const { error } = await supabase
    .from("daily_logs")
    .upsert({ user_id: userId, date, hours: newHours, note: newNote } as never, { onConflict: "user_id,date" });
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
  entry: { learned?: string; mistakes?: string; wins?: string; tomorrow_goal?: string },
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
