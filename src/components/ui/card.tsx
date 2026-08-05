import * as React from "react";
import { cn } from "@/lib/utils";

// interactive=true adds hover elevation + pointer affordance for cards that
// are fully clickable (e.g. wrapped in a <Link>) — previously the only
// hover signal on those cards was the internal link text changing color,
// so the clickable area itself gave no feedback.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-surface",
      interactive && "transition-standard hover:bg-surface-hover hover:border-muted/40 cursor-pointer",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-4 pb-2", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

// size defaults to "md" (text-base) — previously fixed at text-sm, which
// left a gap in the scale between body copy and the text-2xl/3xl stat
// numbers used elsewhere on Dashboard. Pass size="sm" to opt back into
// the old compact size for dense contexts.
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & { size?: "sm" | "md" | "lg" }
>(({ className, size = "md", ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold tracking-tight text-foreground",
      size === "sm" && "text-sm",
      size === "md" && "text-base",
      size === "lg" && "text-xl",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-muted", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

// Default padding stays p-4 pt-2 (assumes a CardHeader sits above). This
// is a known inconsistency (see UI list item #5/#9) — a real fix needs a
// pass through every CardContent call site to either confirm a header
// precedes it or add pt-4 explicitly, which is a larger, separate change
// from the rest of this batch to avoid breaking existing spacing app-wide.
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-2", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-4 pt-2", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };