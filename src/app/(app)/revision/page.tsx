"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, updateTopicProgress } from "@/lib/hooks/use-roadmap";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  tierForReviewCount,
  TIER_LABEL,
  isOverdue,
  daysUntil,
  formatDueDate,
  nextReviewPatch,
  MASTERY_REVIEW_COUNT,
} from "@/lib/revision-schedule";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type FilterKey = "due" | "all" | "overdue" | "bookmarked" | "difficult" | "mastered";

export default function RevisionPage() {
  const { user } = useUser();
  const { phases, isLoading, mutateProgress } = usePhasesWithProgress(user?.id);
  const [filter, setFilter] = useState<FilterKey>("due");

  const completedTopics = useMemo(() => {
    return phases
      .flatMap((p) => p.topics.map((t) => ({ ...t, phaseTitle: p.title, phaseNumber: p.phase_number })))
      .filter((t) => t.progress?.completed);
  }, [phases]);

  const overdueCount = useMemo(
    () => completedTopics.filter((t) => isOverdue(t.progress?.next_review_due ?? null)).length,
    [completedTopics]
  );
  const dueSoonCount = useMemo(
    () =>
      completedTopics.filter((t) => {
        const d = daysUntil(t.progress?.next_review_due ?? null);
        return d !== null && d >= 0 && d <= 3;
      }).length,
    [completedTopics]
  );
  const masteredCount = useMemo(
    () => completedTopics.filter((t) => (t.progress?.review_count ?? 0) >= MASTERY_REVIEW_COUNT).length,
    [completedTopics]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "due":
        return completedTopics
          .filter((t) => {
            const reviewCount = t.progress?.review_count ?? 0;
            if (reviewCount >= MASTERY_REVIEW_COUNT) return false;
            const d = daysUntil(t.progress?.next_review_due ?? null);
            return d !== null && d <= 3;
          })
          .sort((a, b) => {
            const da = daysUntil(a.progress?.next_review_due ?? null) ?? 999;
            const db = daysUntil(b.progress?.next_review_due ?? null) ?? 999;
            return da - db;
          });
      case "overdue":
        return completedTopics.filter((t) => isOverdue(t.progress?.next_review_due ?? null));
      case "bookmarked":
        return completedTopics.filter((t) => t.progress?.bookmarked);
      case "difficult":
        return completedTopics.filter((t) => t.progress?.difficulty === "hard");
      case "mastered":
        return completedTopics.filter((t) => (t.progress?.review_count ?? 0) >= MASTERY_REVIEW_COUNT);
      default:
        return completedTopics;
    }
  }, [completedTopics, filter]);

  async function handleMarkReviewed(topicId: string, currentReviewCount: number) {
    if (!user) return;
    try {
      const patch = nextReviewPatch({ review_count: currentReviewCount });
      await updateTopicProgress(user.id, topicId, patch);
      await mutateProgress();
      const newTier = tierForReviewCount(patch.review_count!);
      toast.success(newTier === "mastered" ? "Mastered 🎉" : `Next review: ${TIER_LABEL[newTier]}`);
    } catch {
      toast.error("Couldn't update.");
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "due", label: "Due soon" },
    { key: "overdue", label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ""}` },
    { key: "all", label: "All" },
    { key: "bookmarked", label: "Bookmarked" },
    { key: "difficult", label: "Difficult" },
    { key: "mastered", label: "Mastered" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Revision</h1>
        <p className="text-sm text-muted mt-1">
          Spaced repetition: 3 reviews at 1 / 3 / 7-day intervals, then mastered.
          {overdueCount > 0 && (
            <span className="text-danger"> {overdueCount} topic{overdueCount === 1 ? "" : "s"} overdue.</span>
          )}
          {overdueCount === 0 && dueSoonCount > 0 && (
            <span className="text-accent"> {dueSoonCount} due in the next 3 days.</span>
          )}
        </p>
      </div>

      {/* Summary strip — same colored-icon-chip pattern as Career's summary
          strip, derived entirely from data already computed above
          (overdueCount, dueSoonCount, mastered count) — no new fetches. */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={cn(
            "rounded-card border p-4 flex items-center gap-3",
            overdueCount > 0 ? "border-danger/30 bg-danger/5" : "border-border bg-surface"
          )}
        >
          <div className="h-9 w-9 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 text-danger" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono-tabular leading-none">{overdueCount}</p>
            <p className="text-[11px] text-muted mt-1">Overdue</p>
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono-tabular leading-none">{dueSoonCount}</p>
            <p className="text-[11px] text-muted mt-1">Due in 3 days</p>
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono-tabular leading-none">{masteredCount}</p>
            <p className="text-[11px] text-muted mt-1">Mastered</p>
          </div>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList className="flex-wrap h-auto bg-surface-2 rounded-full p-1">
          {FILTERS.map((f) => (
            <TabsTrigger
              key={f.key}
              value={f.key}
              className="rounded-full px-3.5 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
            >
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {filtered.map((t) => {
          const reviewCount = t.progress?.review_count ?? 0;
          const tier = tierForReviewCount(reviewCount);
          const overdue = isOverdue(t.progress?.next_review_due ?? null);
          const due = t.progress?.next_review_due ?? null;
          const daysLeft = daysUntil(due);

          return (
            <Card
              key={t.id}
              className={cn(
                "transition-standard hover:border-muted-2/40",
                overdue && "border-danger/40 bg-danger/5"
              )}
            >
              <CardContent noHeader className="py-3.5 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Badge variant="outline" className="font-mono-tabular">
                      {t.phaseNumber}
                    </Badge>
                    <Badge variant={tier === "mastered" ? "success" : "default"}>{TIER_LABEL[tier]}</Badge>
                    {t.progress?.bookmarked && <Badge variant="accent">Bookmarked</Badge>}
                    {t.progress?.difficulty && (
                      <Badge variant={t.progress.difficulty === "hard" ? "danger" : "default"}>
                        {t.progress.difficulty}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted">{t.phaseTitle}</p>
                  {due && tier !== "mastered" && (
                    <p
                      className={cn(
                        "text-[11px] mt-1 flex items-center gap-1",
                        overdue ? "text-danger" : "text-muted"
                      )}
                    >
                      {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {overdue
                        ? `Overdue since ${formatDueDate(due)}`
                        : daysLeft === 0
                          ? "Due today"
                          : `Due ${formatDueDate(due)} (${daysLeft}d)`}
                    </p>
                  )}
                  {tier === "mastered" && (
                    <p className="text-[11px] mt-1 text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Mastered — no longer scheduled
                    </p>
                  )}
                </div>
                {tier !== "mastered" && (
                  <Button size="sm" onClick={() => handleMarkReviewed(t.id, reviewCount)}>
                    Mark reviewed
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState message="Nothing due for revision." />
        )}
      </div>
    </div>
  );
}
