"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CONFIDENCE_LABEL, type ConfidenceRating } from "@/lib/revision-schedule";
import { cn } from "@/lib/utils";

const RATINGS: ConfidenceRating[] = [1, 2, 3, 4, 5];

/**
 * Inline 1-5 confidence picker shown after "Review" is pressed, per the
 * spec's exact scale (1 Forgot .. 5 Mastered). Two-step (press Review,
 * then pick a rating) rather than five always-visible buttons per row,
 * so the revision list doesn't turn into a wall of buttons when there
 * are many topics due.
 */
export function ConfidencePicker({
  onRate,
  onCancel,
}: {
  onRate: (rating: ConfidenceRating) => void;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState<ConfidenceRating | null>(null);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted mr-1">How well did you recall it?</span>
      {RATINGS.map((r) => (
        <Button
          key={r}
          size="sm"
          variant={r <= 2 ? "outline" : r === 3 ? "outline" : "default"}
          className={cn(
            "h-7 px-2.5 text-xs",
            r === 1 && "hover:border-danger/50 hover:text-danger",
            r === 5 && "bg-success/15 text-success border-success/30 hover:bg-success/25"
          )}
          disabled={pending !== null}
          onClick={() => {
            setPending(r);
            onRate(r);
          }}
        >
          {r} · {CONFIDENCE_LABEL[r]}
        </Button>
      ))}
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted" onClick={onCancel} disabled={pending !== null}>
        Cancel
      </Button>
    </div>
  );
}
