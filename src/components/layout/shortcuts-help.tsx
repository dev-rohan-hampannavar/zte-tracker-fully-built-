"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Keyboard } from "lucide-react";

const NAV_SHORTCUTS: { keys: string; label: string; href?: string }[] = [
  { keys: "⌘ / Ctrl K", label: "Open global search" },
  { keys: "?", label: "Show this help" },
  { keys: "G then D", label: "Go to Dashboard", href: "/dashboard" },
  { keys: "G then R", label: "Go to Roadmap", href: "/roadmap" },
  { keys: "G then P", label: "Go to Projects", href: "/projects" },
  { keys: "G then S", label: "Go to DSA Tracker", href: "/dsa" },
  { keys: "G then C", label: "Go to Career Tracker", href: "/career" },
  { keys: "G then A", label: "Go to Achievements", href: "/achievements" },
  { keys: "Esc", label: "Close dialogs / overlays" },
];

// Item 47 — page-local bindings that only make sense on a topic detail
// page (they need that topic's id/completion state, which this
// app-wide component doesn't have). Listed here for discoverability only;
// actually wired in roadmap/topic/[id]/page.tsx.
const TOPIC_PAGE_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "j", label: "Next topic (on a topic page)" },
  { keys: "k", label: "Previous topic (on a topic page)" },
  { keys: "x", label: "Toggle mark-complete (on a topic page)" },
  { keys: "n", label: "Focus notes composer (on a topic page)" },
];

/**
 * Global keyboard-nav layer: "G then <letter>" chord navigation plus a "?"
 * help overlay. Lives once in the (app) layout so it's available everywhere.
 */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [gPending, setGPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if (isTyping) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setGPending(false);
        return;
      }
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        setGPending(true);
        if (gTimeout) clearTimeout(gTimeout);
        gTimeout = setTimeout(() => setGPending(false), 1200);
        return;
      }
      if (gPending) {
        const match = NAV_SHORTCUTS.find(
          (s) => s.href && s.keys.toLowerCase() === `g then ${e.key.toLowerCase()}`
        );
        if (match?.href) {
          e.preventDefault();
          router.push(match.href);
        }
        setGPending(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [gPending, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          </h2>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col divide-y divide-border max-h-[60vh] overflow-y-auto">
          {NAV_SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-muted">{s.label}</span>
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono-tabular">{s.keys}</kbd>
            </div>
          ))}
          <div className="px-4 py-2 text-[11px] uppercase tracking-wide text-muted/70 bg-surface-2/50">
            Topic page
          </div>
          {TOPIC_PAGE_SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-muted">{s.label}</span>
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono-tabular">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
