"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { QuickCapture, QuickCaptureKind, QuickCaptureSource } from "@/types/database";

const supabase = createClient();

/** All unresolved captures — the common case (a quick-capture inbox and
 * the open-blockers list both just want "everything not yet cleared"). */
export function useQuickCaptures(userId: string | undefined) {
  return useSWR(userId ? ["quick-captures", userId] : null, async () => {
    const { data, error } = await supabase
      .from("quick_captures")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as QuickCapture[];
  });
}

export interface CaptureContext {
  entityType: string;
  entityId: string;
  label: string;
}

/**
 * Item 10 + item 18 — logs a stray idea or blocker immediately, from
 * wherever the person is. `source` records whether it came from typed
 * text or voice-to-text (item 18 is purely an input method into this
 * same function, not a separate capture path).
 */
export async function addQuickCapture(
  userId: string,
  body: string,
  kind: QuickCaptureKind = "idea",
  source: QuickCaptureSource = "text",
  context?: CaptureContext
) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase.from("quick_captures").insert({
    user_id: userId,
    body: trimmed,
    kind,
    source,
    context_entity_type: context?.entityType ?? null,
    context_entity_id: context?.entityId ?? null,
    context_label: context?.label ?? null,
  } as never);
  if (error) throw error;
}

/** Item 13 — resolving a blocker (or dismissing an idea once acted on)
 * without deleting the record, so it still shows up in history. */
export async function resolveQuickCapture(id: string) {
  const { error } = await supabase
    .from("quick_captures")
    .update({ resolved_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuickCapture(id: string) {
  const { error } = await supabase.from("quick_captures").delete().eq("id", id);
  if (error) throw error;
}

export function openBlockers(captures: QuickCapture[] | undefined) {
  return (captures ?? []).filter((c) => c.kind === "blocker" && !c.resolved_at);
}

export function openIdeas(captures: QuickCapture[] | undefined) {
  return (captures ?? []).filter((c) => c.kind === "idea" && !c.resolved_at);
}
