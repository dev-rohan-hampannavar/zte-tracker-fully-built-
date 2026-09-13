"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Mic, MicOff, Lightbulb, AlertTriangle } from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import { addQuickCapture } from "@/lib/hooks/use-quick-capture";
import { enqueueCapture } from "@/lib/offline-queue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Minimal ambient typing for the Web Speech API — not in lib.dom.d.ts by
// default and only needed here, so kept local rather than a global.d.ts
// addition that would apply everywhere.
interface MinimalSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Items 10 + 18 — global quick-capture. A small floating action button
 * mounted once (in AppTopbar) so it's reachable from any page, not just
 * a form buried on one page — the whole point is capturing a stray
 * thought or blocker without navigating away from what you're doing.
 * Item 13's blocker tag is just the "Blocker" kind toggle here, going
 * into the same store as ideas rather than a separate mechanism.
 */
export function QuickCaptureButton() {
  const { user } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"idea" | "blocker">("idea");
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // One-shot client capability check — must run after mount (SSR has no
  // window/SpeechRecognition), so this genuinely needs an effect rather
  // than a lazy useState initializer, which would cause a hydration
  // mismatch on the mic button's presence in markup.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(!!getSpeechRecognition());
  }, []);

  // Keyboard shortcut hookup for item 30 lives in use-quick-capture-shortcut.ts,
  // which calls this via a custom event so this component doesn't need to
  // know about the global shortcut registry directly.
  useEffect(() => {
    function handler() {
      setOpen(true);
    }
    window.addEventListener("zte:open-quick-capture", handler);
    return () => window.removeEventListener("zte:open-quick-capture", handler);
  }, []);

  function toggleListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) setBody((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function handleSubmit() {
    if (!user || !body.trim()) return;
    setSubmitting(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // Offline path: persist to IndexedDB and sync on reconnect.
        // The user gets a toast so they know the capture happened even
        // though it hasn't hit Supabase yet — critical for blockers.
        await enqueueCapture({
          userId: user.id,
          body: body.trim(),
          kind,
          source: listening ? "voice" : "text",
          contextEntityType: "page",
          contextEntityId: pathname ?? "/",
          contextLabel: pathname ?? null,
          queuedAt: new Date().toISOString(),
        });
        // Notify useOfflineSync (via OfflineIndicator) to refresh its count.
        window.dispatchEvent(new Event("zte:capture-queued"));
        toast.success(
          kind === "blocker"
            ? "Blocker saved offline — syncs automatically when you reconnect."
            : "Idea saved offline — syncs automatically when you reconnect."
        );
      } else {
        await addQuickCapture(user.id, body, kind, listening ? "voice" : "text", {
          entityType: "page",
          entityId: pathname ?? "/",
          label: pathname ?? undefined,
        } as never);
        toast.success(kind === "blocker" ? "Blocker logged." : "Idea captured.");
      }
      setBody("");
      setKind("idea");
      setOpen(false);
    } catch {
      toast.error("Couldn't save that — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-standard"
        aria-label="Quick capture"
        title="Quick capture (idea or blocker)"
      >
        <Plus className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick capture</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setKind("idea")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  kind === "idea" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                )}
              >
                <Lightbulb className="h-3.5 w-3.5" /> Idea
              </button>
              <button
                onClick={() => setKind("blocker")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                  kind === "blocker" ? "border-danger bg-danger/10 text-danger" : "border-border text-muted-foreground"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Blocker
              </button>
            </div>

            <div className="relative">
              <Textarea
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={kind === "blocker" ? "What's blocking you?" : "What's on your mind?"}
                className="min-h-[100px] pr-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              {speechSupported && (
                <button
                  onClick={toggleListening}
                  className={cn(
                    "absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    listening ? "bg-danger/15 text-danger" : "text-muted-foreground hover:text-accent hover:bg-surface-2"
                  )}
                  aria-label={listening ? "Stop voice input" : "Start voice input"}
                  title={listening ? "Stop voice input" : "Start voice input"}
                  type="button"
                >
                  {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">⌘/Ctrl + Enter to save</p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!body.trim() || submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
