"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Terminal,
  LayoutGrid,
  Target,
  Clock,
  TrendingUp,
  BookOpen,
  Share2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface TourStep {
  icon: typeof Target;
  eyebrow: string;
  title: string;
  body: string;
}

// Step 0 is the app-level welcome ("what is this / what is a dashboard");
// steps 1+ walk the actual dashboard features. Kept in one array so the
// same stepper/progress-dot UI drives both without a special case.
const STEPS: TourStep[] = [
  {
    icon: Terminal,
    eyebrow: "Welcome",
    title: "This is ZTE Tracker",
    body: "Zero to Elite is your full-stack curriculum — 21 phases, 363 topics — turned into a system instead of a document. This quick tour shows you where everything lives before you dive in.",
  },
  {
    icon: LayoutGrid,
    eyebrow: "The dashboard",
    title: "Your dashboard is home base",
    body: "Every time you sign in, this is what you'll see: today's task, your streak, and how far along the roadmap you are — all in one glance, no digging through menus.",
  },
  {
    icon: Target,
    eyebrow: "Daily Mission",
    title: "One next step, always",
    body: "This card only ever shows one thing: the next topic on your roadmap. No decision-making required — open the dashboard, see the mission, start.",
  },
  {
    icon: BookOpen,
    eyebrow: "Today's Lesson",
    title: "The full lesson, on demand",
    body: "Expand Daily Mission for the day's complete plan — objectives, resources, and hands-on problems you can check off as you go.",
  },
  {
    icon: Clock,
    eyebrow: "Logging hours",
    title: "Time you log actually counts",
    body: "Logging hours isn't a journal entry — it fills the current topic's progress bar and auto-completes it once you hit the estimate, rolling extra time into what's next.",
  },
  {
    icon: TrendingUp,
    eyebrow: "Pace & projections",
    title: "Know if you're ahead or behind",
    body: "The badge beside your current topic shows your pace against the roadmap's own estimate. Statistics has a full projected finish date, based on how you're actually studying.",
  },
  {
    icon: Share2,
    eyebrow: "Build in public",
    title: "Turn progress into proof",
    body: "Enable a public profile in Settings to share a read-only page — completed phases, shipped projects, your build-in-public trail. Good for job applications.",
  },
];

export function DashboardTour({ userId }: { userId: string }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger the entrance animation on the next frame rather than at
    // initial render, so the CSS transition actually has a "from" state
    // to animate away from instead of snapping straight to visible.
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  async function markSeen() {
    const supabase = createClient();
    // Fire-and-forget: even if this write fails, the dialog still closes
    // for this session — worst case the tour reappears next load, which is
    // a minor annoyance, not worth blocking the close on.
    supabase
      .from("user_settings")
      .update({ dashboard_tour_seen: true } as never)
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) console.error("Failed to mark dashboard tour seen:", error);
      });
  }

  function handleOpenChange(next: boolean) {
    if (!next) markSeen();
    setOpen(next);
  }

  function handleFinish() {
    markSeen();
    setOpen(false);
  }

  function goTo(next: number) {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/95 backdrop-blur-md transition-opacity duration-300",
            mounted ? "opacity-100" : "opacity-0"
          )}
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            Welcome to ZTE Tracker
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            A short introduction to the dashboard and how to use ZTE Tracker.
          </DialogPrimitive.Description>

          <DialogPrimitive.Close className="absolute right-5 top-5 md:right-8 md:top-8 z-10 rounded-full p-2 text-muted opacity-70 hover:opacity-100 hover:bg-surface-2 transition-standard">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div
              className={cn(
                "w-full max-w-xl flex flex-col items-center text-center gap-8 transition-all duration-500 ease-out",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              {/* Icon — key forces remount so the pop-in animation replays every step */}
              <div
                key={step}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent animate-tour-icon-in"
              >
                <Icon className="h-9 w-9" />
              </div>

              <div key={`text-${step}`} className="flex flex-col gap-3 animate-tour-text-in">
                <span className="text-xs font-medium uppercase tracking-wider text-accent">
                  {current.eyebrow}
                </span>
                <h2 className="text-page-title font-semibold tracking-tight text-balance">
                  {current.title}
                </h2>
                <p className="text-xl text-muted leading-relaxed text-balance">
                  {current.body}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col items-center gap-6 px-6 pb-10 md:pb-14">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-8 bg-accent" : "w-1.5 bg-border hover:bg-muted-2"
                  )}
                />
              ))}
            </div>

            <div className="w-full max-w-xs flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goTo(Math.max(0, step - 1))}
                disabled={isFirst}
                className="gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <button
                onClick={handleFinish}
                className="text-xs text-muted hover:text-foreground transition-standard"
              >
                Skip
              </button>
              {isLast ? (
                <Button size="sm" onClick={handleFinish}>
                  Get started
                </Button>
              ) : (
                <Button size="sm" onClick={() => goTo(step + 1)} className="gap-1">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}