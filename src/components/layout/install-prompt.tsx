"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Chrome/Edge/Android fire beforeinstallprompt and expose a typed prompt()
// method; this isn't in lib.dom.d.ts, so the shape is declared by hand
// here rather than widening Window globally for the rest of the app.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "ztd-install-prompt-dismissed";

/**
 * Shows a small dismissible banner offering to install the PWA, using the
 * same manifest.json + service worker (public/sw.js) already registered by
 * OfflineIndicator — this component only adds the missing install-prompt
 * UI, it doesn't touch registration or caching at all.
 *
 * Browser support note: beforeinstallprompt is Chromium-only (Chrome,
 * Edge, Android/Samsung Internet) — Safari and Firefox never fire it, so
 * this banner simply never appears there, which is correct (nothing to
 * prompt: iOS installs via the native Share sheet instead, and adding
 * iOS-specific "how to install" instructions here would be guessing at a
 * flow the plan didn't ask for). Once installed (display-mode: standalone)
 * or previously dismissed, it stays hidden — checked via matchMedia and
 * localStorage respectively, both read only after mount so this never
 * causes a server/client render mismatch.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return; // already installed
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice; // resolved either way — nothing to branch on, the banner closes regardless
    setDeferredPrompt(null);
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40 rounded-lg border border-border bg-surface shadow-lg p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
        <Download className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Install ZTE Tracker</p>
        <p className="text-xs text-muted mt-0.5">Add it to your home screen for quick, full-screen access.</p>
        <div className="flex gap-2 mt-2.5">
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="text-muted hover:text-foreground shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
