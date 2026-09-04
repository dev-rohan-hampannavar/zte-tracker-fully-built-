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
