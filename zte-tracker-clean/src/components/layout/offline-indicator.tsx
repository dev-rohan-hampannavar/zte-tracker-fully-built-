"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { useOfflineSync } from "@/lib/hooks/use-offline-sync";

/**
 * navigator.onLine is external browser state, not component state derived
 * from props — useSyncExternalStore is React's own recommended primitive
 * for exactly this (subscribe to online/offline events, read the current
 * value), and it sidesteps the react-hooks/set-state-in-effect trap that
 * `useState(false)` + `setIsOffline(!navigator.onLine)` inside a mount
 * effect falls into (the same category already flagged as pre-existing
 * elsewhere in this codebase, per STAGE_5_CHANGELOG — not something this
 * file should add a fresh instance of).
 * getServerSnapshot returns false (never show the badge during SSR/before
 * hydration, when navigator doesn't exist) so this never mismatches
 * between server and client render.
 */
function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * Registers the hand-written service worker (public/sw.js) once, and shows
 * a small persistent badge whenever the browser reports offline. The badge
 * matters for the same reason the SW itself is scoped the way it is: this
 * app's pages all show live, per-user data, so if someone is looking at a
 * cached shell with stale SWR data, they should be able to tell at a glance
 * — never presenting offline/possibly-stale content identically to a live
 * session.
 *
 * Registration lives here (not inline in layout.tsx) so it's a client
 * component that can safely touch `navigator`/`window`, while the root
 * layout stays a server component.
 *
 * #28: Also hosts useOfflineSync — this is the one component that's always
 * mounted in the app layout and has access to window/navigator, so it's the
 * right place to register the `online` flush handler. The hook runs even
 * when this component returns null (React hooks outlive the render return
 * value), so sync fires on reconnect regardless of whether the offline badge
 * is currently showing. pendingCount drives the "N items pending" label.
 */
export function OfflineIndicator() {
  const isOffline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => !navigator.onLine,
    () => false
  );

  // #28: useOfflineSync is called unconditionally (hooks rule) so the
  // online event listener is always registered, not just when offline.
  const { pendingCount } = useOfflineSync();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing (unsupported browser, blocked by an
        // extension, etc.) should never break the app itself — offline
        // support degrades to "unavailable," not "app doesn't load."
      });
    }
  }, []);

  if (!isOffline) return null;

  const pendingLabel =
    pendingCount > 0
      ? ` — ${pendingCount} item${pendingCount === 1 ? "" : "s"} queued`
      : "";

  return (
    <div
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-lg"
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5 text-warning" />
      Offline{pendingLabel}
    </div>
  );
}
