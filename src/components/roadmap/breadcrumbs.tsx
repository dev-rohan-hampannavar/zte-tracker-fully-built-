"use client";

import Link from "next/link";
import { ChevronRight, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string; // omit for the current (final) page — rendered as plain text, not a link
};

/**
 * Roadmap / Phase 01 / Stage 1 / VS Code — used on the three nested
 * roadmap detail pages (phase, stage, topic) so there's a visible path
 * back to any ancestor level, not just the immediate parent via a single
 * "Back to roadmap" link. Always starts from Roadmap itself.
 */
export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-xs flex-wrap", className)}>
      <Link href="/roadmap" className="flex items-center gap-1 text-muted hover:text-foreground transition-standard">
        <Map className="h-3 w-3" />
        Roadmap
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted/50 shrink-0" />
            {item.href && !isLast ? (
              <Link href={item.href} className="text-muted hover:text-foreground transition-standard truncate max-w-[200px]">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[240px]" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}