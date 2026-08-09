"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { formatDueDate, nextReviewPatch } from "@/lib/revision-schedule";
import { updateTopicProgress } from "@/lib/hooks/use-roadmap";
import type { TopicWithProgress } from "@/types/database";

interface RevisionDueWidgetProps {
  userId: string;
  overdueTopics: TopicWithProgress[];
  onReviewed: () => unknown;
}

/**
 * Compact "due for review" list on Daily Mission — same overdue detection
 * the notification bell and /revision page already use (isOverdue on
 * next_review_due), but surfaced as something actionable right where the
 * user already is, rather than only as a bell count or a separate page
 * they have to navigate to. Marking a topic reviewed here calls the exact
 * same nextReviewPatch/updateTopicProgress pair /revision uses, so review
 * state stays in sync regardless of which surface it was actioned from.
 */
export function RevisionDueWidget({ userId, overdueTopics, onReviewed }: RevisionDueWidgetProps) {
  if (overdueTopics.length === 0) return null;

  async function handleReviewed(topicId: string, currentReviewCount: number) {
    const patch = nextReviewPatch({ review_count: currentReviewCount });
    await updateTopicProgress(userId, topicId, patch);
    await onReviewed();
  }

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
          <div
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm truncate">{t.title}</p>
              {t.progress?.next_review_due && (
                <p className="text-xs text-muted">
                  Due {formatDueDate(t.progress.next_review_due)}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => handleReviewed(t.id, t.progress?.review_count ?? 0)}
            >
              Reviewed
            </Button>
          </div>
        ))}
        {overdueTopics.length > 4 && (
          <p className="text-xs text-muted">+{overdueTopics.length - 4} more on the Revision page</p>
        )}
      </div>
    </div>
  );
}
