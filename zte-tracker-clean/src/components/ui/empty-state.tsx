import { cn } from "@/lib/utils";
import { FadeUp } from "@/components/motion/primitives";

// Unifies the empty-state copy that was previously written ad hoc per page
// ("No matches.", "Nothing here right now.", "No X found in Y data.", "No X
// yet.") — item #15. One component, one tone: plain "No <thing>." for a
// genuinely empty collection, optionally with a short next-step hint.
export function EmptyState({
  message,
  hint,
  className,
}: {
  message: string;
  hint?: string;
  className?: string;
}) {
  return (
    <FadeUp className={cn("text-center py-8", className)}>
      <p className="text-sm text-muted">{message}</p>
      {hint && <p className="text-xs text-muted/70 mt-1">{hint}</p>}
    </FadeUp>
  );
}
