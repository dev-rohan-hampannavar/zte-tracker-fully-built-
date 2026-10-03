"use client";

import Link from "next/link";
import { CalendarClock, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TimeBlock, WeeklyCommitment } from "@/types/database";

/**
 * Cross-visibility between the two planning surfaces that don't otherwise
 * share data: the system-generated daily plan (daily_plan_task_state) and
 * the user-authored weekly plan (weekly_commitments/time_blocks from the
 * Execution OS, migration 0052). Neither table was merged into the other —
 * they represent genuinely different things (an adaptive recommendation
 * queue vs. a manually committed week) — but a person looking at "what do
 * I do today" should still see today's scheduled time blocks and this
 * week's three commitments without navigating away. Read-only here; all
 * mutation stays on /execution, which remains the single place those rows
 * are created/edited.
 */
function formatTime(time: string) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function ExecutionContextCard({
  todaysBlocks,
  weeklyCommitments,
}: {
  todaysBlocks: TimeBlock[];
  weeklyCommitments: WeeklyCommitment[];
}) {
  if (todaysBlocks.length === 0 && weeklyCommitments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-accent" /> This week&apos;s commitments &amp; today&apos;s blocks
          </CardTitle>
          <Link href="/execution" className="text-xs text-accent hover:underline shrink-0">
            Edit in Execution OS
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {weeklyCommitments.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <ListTodo className="h-3 w-3" /> Three commitments
            </p>
            <ul className="flex flex-col gap-1">
              {weeklyCommitments.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      c.status === "completed" ? "bg-success" : c.status === "skipped" ? "bg-muted" : "bg-accent"
                    )}
                  />
                  <span className={cn(c.status === "completed" && "line-through text-muted")}>{c.title}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] capitalize shrink-0">
                    {c.domain}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {todaysBlocks.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted pt-3">
              <CalendarClock className="h-3 w-3" /> Scheduled today
            </p>
            <ul className="flex flex-col gap-1">
              {todaysBlocks.map((b) => (
                <li key={b.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted font-mono-tabular shrink-0">
                    {formatTime(b.start_time)}–{formatTime(b.end_time)}
                  </span>
                  <span className={cn(b.status === "completed" && "line-through text-muted")}>{b.title}</span>
                  <Badge variant="outline" className="ml-auto text-[10px] capitalize shrink-0">
                    {b.block_type}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
