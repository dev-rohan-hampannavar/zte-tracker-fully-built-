import * as React from "react";
import { cn } from "@/lib/utils";

// interactive=true adds hover elevation + pointer affordance for cards that
// are fully clickable (e.g. wrapped in a <Link>) — previously the only
// hover signal on those cards was the internal link text changing color,
// so the clickable area itself gave no feedback. Elevation comes from a
// soft shadow + 1px lift rather than a heavy box-shadow, per the "subtle
// shadows, spacing does the work" rule in the design spec.
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-card border border-border bg-surface shadow-sm shadow-black/20",
      // "wow" pass: interactive cards now also pick up glow-card's colored
      // border/shadow glow on hover, layered on top of the existing
      // lift/elevation treatment rather than replacing it.
      interactive &&
        "transition-transform transition-colors transition-shadow duration-200 ease-out hover:bg-surface-hover hover:border-accent/50 hover:-translate-y-2 hover:scale-[1.015] hover:shadow-xl hover:shadow-black/40 cursor-pointer glow-card",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-5 pb-2", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

// size defaults to "md" (text-card-title, 20px per the design spec) —
// previously fixed at text-base. Pass size="sm" to opt back into the old
// compact size for dense contexts, or "lg" for hero/feature cards.
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & { size?: "sm" | "md" | "lg" }
>(({ className, size = "md", ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold tracking-tight text-foreground",
      size === "sm" && "text-sm",
      size === "md" && "text-card-title",
      size === "lg" && "text-section-title",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

// Default padding is p-5 pt-2, which assumes a CardHeader sits above it
// (pt-2 relies on the header's own pb-2 to make up the visual gap). Cards
// with no header need noHeader to get pt-5 instead — this used to be done
// ad hoc via className="pt-4" at ~40 call sites; noHeader replaces all of
// those with a single prop so the rule lives in the component, not copied
// at every usage. Padding bumped from p-4 to p-5 (16px -> 20px) to match
// the "generous spacing, avoid dense layouts" rule in the design spec.
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { noHeader?: boolean }
>(({ className, noHeader, ...props }, ref) => (
  <div ref={ref} className={cn(noHeader ? "p-5" : "p-5 pt-2", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-2", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };