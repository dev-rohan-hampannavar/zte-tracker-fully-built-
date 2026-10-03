"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  Target,
  Clock,
  TrendingUp,
  BookOpen,
  Share2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface TourStep {
  icon: typeof Target;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    icon: Target,
    title: "Daily Mission",
    body: "This card always shows exactly one thing: the next topic on your roadmap. No decision-making required — just open the dashboard and start.",
  },
  {
    icon: BookOpen,
    title: "Today's Lesson",
    body: "Expand it under Daily Mission for the full day's lesson plan — objectives, resources, and hands-on practice problems you can check off as you go.",
  },
  {
    icon: Clock,
    title: "Log your hours",
    body: "Logging hours here isn't just a journal entry — it fills the current topic's progress bar and auto-completes it once you hit the estimated hours, rolling any extra time into what's next.",
  },
  {
    icon: TrendingUp,
    title: "Pace & projections",
    body: "The badge next to your current topic shows if you're ahead or behind the roadmap's own estimate. Statistics has a full projected finish date, based on your real pace.",
  },
  {
    icon: Share2,
    title: "Build in public",
    body: "Turn on a public profile in Settings to share a read-only page: completed phases, shipped projects, and your build-in-public post trail — good for job applications.",
  },
];

export function DashboardTour({ userId }: { userId: string }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);

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

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col gap-5 pt-2">
          <div className="h-11 w-11 rounded-full bg-accent/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-accent" />
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-tight">{current.title}</h2>
            <p className="text-sm text-muted leading-relaxed mt-2">{current.body}</p>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-standard ${
                  i === step ? "w-6 bg-accent" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
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
              <Button size="sm" onClick={() => setStep((s) => s + 1)} className="gap-1">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
