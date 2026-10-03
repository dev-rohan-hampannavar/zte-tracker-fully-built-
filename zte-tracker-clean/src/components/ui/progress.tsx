"use client";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { glow?: boolean; label?: string }
>(({ className, value, glow, label, ...props }, ref) => {
  const pct = value || 0;
  // Color escalation: under 30% reads as "still early" (warning tone),
  // 30-99% as "on track" (accent), 100% as "done" (success) — gives the
  // bar itself signal beyond just its length, consistent everywhere it's
  // used (Dashboard stats, topic detail, roadmap phase cards, etc.).
  // This is a visual-only signal (color), so every call site should also
  // pass `label` — Radix's Progress.Root already exposes role="progressbar"
  // and aria-valuenow from `value`, but with no accessible name a screen
  // reader announces only a bare "N% progressbar" with no context for
  // which metric it is. `label` becomes aria-label; pages with visible
  // adjacent text (e.g. a heading right before the bar) can pass the same
  // string so sighted and screen-reader users get equivalent context.
  const tier = pct >= 100 ? "done" : pct >= 30 ? "mid" : "low";

  return (
    <ProgressPrimitive.Root
      ref={ref}
      aria-label={label}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-progress-tier={tier}
        className={cn(
          "h-full w-full flex-1 transition-all duration-500 ease-out relative overflow-hidden",
          // glow is opt-in (default off) so every existing call site keeps
          // its current flat appearance; pass glow on the handful of
          // "signature" progress bars (e.g. dashboard hero stat) that
          // should feel more alive.
          glow && "shadow-[0_0_12px_rgb(var(--accent-glow)/0.6)]"
        )}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      >
        {glow && pct > 0 && pct < 100 && <span className="absolute inset-0 shimmer" />}
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };