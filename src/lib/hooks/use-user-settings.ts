"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings, PinnedItem } from "@/types/database";

/**
 * Fetches the full user_settings row. Extracted from the Settings page
 * (where it originated as a private helper) so other callers — e.g. the
 * Calendar view's weekly-pace projection — can read the same
 * weekly_goal_type/weekly_goal_value the person has already set, rather
 * than duplicating this query or inventing a second settings source.
 */
export function useUserSettings(userId: string | undefined) {
  const supabase = createClient();
  return useSWR(userId ? ["settings", userId] : null, async () => {
    const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId!).single();
    if (error) throw error;
    return data as UserSettings;
  });
}

// Item 51 — Workspace pinning. Max 8, most-recent-first, stored on
// user_settings.pinned_items (0016_pinned_items.sql). Re-pinning an
// already-pinned item just bumps it to the front rather than duplicating.
export const MAX_PINNED_ITEMS = 8;

export async function pinItem(userId: string, item: Omit<PinnedItem, "pinned_at">) {
  const supabase = createClient();
  const { data: current, error: readErr } = await supabase
    .from("user_settings")
    .select("pinned_items")
    .eq("user_id", userId)
    .single();
  if (readErr) throw readErr;
  const existing = (((current as { pinned_items: PinnedItem[] } | null)?.pinned_items) ?? []).filter(
    (p) => !(p.type === item.type && p.id === item.id)
  );
  const next: PinnedItem[] = [{ ...item, pinned_at: new Date().toISOString() }, ...existing].slice(
    0,
    MAX_PINNED_ITEMS
  );
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, pinned_items: next } as never, { onConflict: "user_id" });
  if (error) throw error;
  return next;
}

export async function unpinItem(userId: string, type: PinnedItem["type"], id: string) {
  const supabase = createClient();
  const { data: current, error: readErr } = await supabase
    .from("user_settings")
    .select("pinned_items")
    .eq("user_id", userId)
    .single();
  if (readErr) throw readErr;
  const next = (((current as { pinned_items: PinnedItem[] } | null)?.pinned_items) ?? []).filter(
    (p) => !(p.type === type && p.id === id)
  );
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, pinned_items: next } as never, { onConflict: "user_id" });
  if (error) throw error;
  return next;
}

export function isPinned(pinned: PinnedItem[] | undefined, type: PinnedItem["type"], id: string) {
  return !!pinned?.some((p) => p.type === type && p.id === id);
}

// Item 11 — "Today's non-negotiable". A single commitment, date-scoped,
// distinct from the pinned_items list above. `getTodayISO` uses the
// browser's local date, matching how streaks/daily logs already reason
// about "today" elsewhere in the app (see use-daily-logs.ts).
function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type DailyCommitment = {
  type: NonNullable<UserSettings["daily_commitment_type"]>;
  id: string | null;
  label: string;
  date: string;
  doneAt: string | null;
} | null;

/** Resolves the raw settings columns into a commitment object, or null if
 * none is set OR the stored one is from a previous day (a stale
 * commitment isn't silently carried forward — see migration comment). */
export function resolveDailyCommitment(settings: UserSettings | undefined): DailyCommitment {
  if (!settings?.daily_commitment_type || !settings.daily_commitment_label || !settings.daily_commitment_date) {
    return null;
  }
  if (settings.daily_commitment_date !== getTodayISO()) return null;
  return {
    type: settings.daily_commitment_type,
    id: settings.daily_commitment_id,
    label: settings.daily_commitment_label,
    date: settings.daily_commitment_date,
    doneAt: settings.daily_commitment_done_at,
  };
}

export async function setDailyCommitment(
  userId: string,
  commitment: { type: NonNullable<UserSettings["daily_commitment_type"]>; id: string | null; label: string }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        daily_commitment_type: commitment.type,
        daily_commitment_id: commitment.id,
        daily_commitment_label: commitment.label,
        daily_commitment_date: getTodayISO(),
        daily_commitment_done_at: null,
      } as never,
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

export async function completeDailyCommitment(userId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ daily_commitment_done_at: new Date().toISOString() } as never)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function clearDailyCommitment(userId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_settings")
    .update({
      daily_commitment_type: null,
      daily_commitment_id: null,
      daily_commitment_label: null,
      daily_commitment_date: null,
      daily_commitment_done_at: null,
    } as never)
    .eq("user_id", userId);
  if (error) throw error;
}
