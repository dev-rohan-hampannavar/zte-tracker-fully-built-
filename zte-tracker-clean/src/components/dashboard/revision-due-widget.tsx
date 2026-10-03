"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { formatDueDate } from "@/lib/revision-schedule";
import type { TopicWithProgress } from "@/types/database";

interface RevisionDueWidgetProps {
  overdueTopics: TopicWithProgress[];
}

/**
 * Compact "due for review" list on Daily Mission — same overdue detection
 * the notification bell and /revision page already use (isOverdue on
 * next_review_due). Each topic links to the Revision page rather than
 * offering a one-click "Reviewed" here: reviewing now asks for a 1-5
 * confidence rating (see ConfidencePicker) so the next interval reflects
 * actual retention, and that picker needs more room than this compact
 * card has — better to send the person to the page where it fits than to
 * offer a blind shortcut that skips the rating entirely.
 */
export function RevisionDueWidget({ overdueTopics }: RevisionDueWidgetProps) {
  if (overdueTopics.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <RotateCcw className="h-3.5 w-3.5 text-warning" />
        <span className="text-xs font-medium text-muted">
          {overdueTopics.length} due for revision
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {overdueTopics.slice(0, 4).map((t) => (
          <Link
            key={t.id}
            href="/revision"
            className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 hover:border-warning/50 transition-standard"
          >
            <div className="min-w-0">
              <p className="text-sm truncate">{t.title}</p>
              {t.progress?.next_review_due && (
                <p className="text-xs text-muted">
                  Due {formatDueDate(t.progress.next_review_due)}
                </p>
              )}
            </div>
          </Link>
        ))}
        {overdueTopics.length > 4 && (
          <p className="text-xs text-muted">+{overdueTopics.length - 4} more on the Revision page</p>
        )}
      </div>
    </div>
  );
}
