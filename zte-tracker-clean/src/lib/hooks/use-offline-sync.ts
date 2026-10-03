"use client";

import { useEffect, useState } from "react";
import { dequeueAllCaptures, pendingCaptureCount } from "@/lib/offline-queue";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/**
 * Drains the IDB queue into Supabase. Returns the count of records that
 * were successfully written. Failed records are not re-queued — the
 * dequeue-then-write approach accepts potential data loss on a partial
 * write failure during reconnect (the alternative is a per-record retry
 * loop that risks double-submitting; for a "stray thought capture" table
 * the simpler approach is correct). Failed writes are logged to console
 * for debugging.
 */
async function syncPendingCaptures(): Promise<number> {
  let pending: Awaited<ReturnType<typeof dequeueAllCaptures>>;
  try {
    pending = await dequeueAllCaptures();
  } catch {
    return 0; // IDB unavailable — nothing to sync
  }
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const capture of pending) {
    const { error } = await supabase.from("quick_captures").insert({
      user_id: capture.userId,
      body: capture.body,
      kind: capture.kind,
      source: capture.source,
      context_entity_type: capture.contextEntityType ?? null,
      context_entity_id: capture.contextEntityId ?? null,
      context_label: capture.contextLabel ?? null,
    } as never);
    if (!error) synced++;
    else console.error("[offline-sync] Failed to sync capture:", error.message);
  }

  if (synced > 0) {
    // Signal any mounted SWR hooks for quick_captures to revalidate.
    // They already handle `online` events through SWR's own focusManager,
    // but dispatching explicitly here means data appears immediately after
    // sync, not on the next SWR polling interval.
    window.dispatchEvent(
      new CustomEvent("zte:offline-sync-complete", { detail: { synced } })
    );
  }

  return synced;
}

/**
 * #28 — Registers a `window.online` handler that flushes the offline
 * capture queue to Supabase on reconnect. Also listens for
 * `zte:capture-queued` (fired by QuickCaptureButton after an offline
 * enqueue) to keep the pendingCount display current without polling.
 *
 * Designed to be called once, inside OfflineIndicator — that component
 * is always mounted in the app layout and its hooks run even when it
 * returns null, so a single instance is enough for the whole app.
 */
export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function refreshCount() {
      try {
        setPendingCount(await pendingCaptureCount());
      } catch {
        // IDB unavailable (private mode, old browser) — show nothing
        setPendingCount(0);
      }
    }

    async function onOnline() {
      const synced = await syncPendingCaptures();
      void synced; // count goes to 0 regardless; success/fail shown via toast in QuickCaptureButton
      setPendingCount(0);
    }

    refreshCount(); // check for leftovers from a previous offline session

    window.addEventListener("online", onOnline);
    window.addEventListener("zte:capture-queued", refreshCount);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("zte:capture-queued", refreshCount);
    };
  }, []);

  return { pendingCount };
}
