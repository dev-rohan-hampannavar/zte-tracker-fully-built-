"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, markTopicReviewed } from "@/lib/hooks/use-roadmap";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useInterviewWeaknesses } from "@/lib/hooks/use-interview-prep";
import Link from "next/link";
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
  nextReviewPatchWithRating,
  MASTERY_REVIEW_COUNT,
  CONFIDENCE_LABEL,
  type ConfidenceRating,
} from "@/lib/revision-schedule";
import { ConfidencePicker } from "@/components/revision/confidence-picker";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";

type FilterKey = "due" | "all" | "overdue" | "bookmarked" | "difficult" | "mastered";

export default function RevisionPage() {
  const { user } = useUser();
  const { phases, isLoading, mutateProgress } = usePhasesWithProgress(user?.id);
  const { data: dsaProblems } = useDsaProgress(user?.id);
  const { data: interviewWeaknesses } = useInterviewWeaknesses(user?.id);
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

  const overdueDsaCount = useMemo(
    () => (dsaProblems ?? []).filter((p) => p.completed && isOverdue(p.next_review_due)).length,
    [dsaProblems]
  );
  const weakConceptCount = interviewWeaknesses?.length ?? 0;

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

  const [ratingTopicId, setRatingTopicId] = useState<string | null>(null);

  async function handleMarkReviewed(topicId: string, currentReviewCount: number, topicTitle: string, rating: ConfidenceRating) {
    if (!user) return;
    try {
      const patch = nextReviewPatchWithRating({ review_count: currentReviewCount }, rating);
      await markTopicReviewed(user.id, topicId, topicTitle, patch, rating);
      await mutateProgress();
      setRatingTopicId(null);
      const newTier = tierForReviewCount(patch.review_count!);
      toast.success(
        newTier === "mastered"
          ? "Mastered 🎉"
          : `${CONFIDENCE_LABEL[rating]} — next review: ${TIER_LABEL[newTier]}`
      );
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
      <FadeUp>
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
      </FadeUp>

      {/* Summary strip — same colored-icon-chip pattern as Career's summary
          strip, derived entirely from data already computed above
          (overdueCount, dueSoonCount, mastered count) — no new fetches. */}
      <StaggerContainer className="grid grid-cols-3 gap-3">
        <StaggerItem>
        <div
          className={cn(
            "rounded-card border p-4 flex items-center gap-3 glow-card",
            overdueCount > 0 ? "border-danger/30 bg-danger/5" : "border-border bg-surface"
          )}
        >
          <div className="h-9 w-9 rounded-full bg-danger/15 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 text-danger" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono-tabular leading-none"><AnimatedCounter value={overdueCount} /></p>
            <p className="text-[11px] text-muted mt-1">Overdue</p>
          </div>
        </div>
        </StaggerItem>
        <StaggerItem>
        <div className="rounded-card border border-border bg-surface p-4 flex items-center gap-3 glow-card">
          <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono-tabular leading-none"><AnimatedCounter value={dueSoonCount} /></p>
            <p className="text-[11px] text-muted mt-1">Due in 3 days</p>
          </div>
        </div>
        </StaggerItem>
        <StaggerItem>
        <div className="rounded-card border border-border bg-surface p-4 flex items-center gap-3 glow-card">
          <div className="h-9 w-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono-tabular leading-none"><AnimatedCounter value={masteredCount} /></p>
            <p className="text-[11px] text-muted mt-1">Mastered</p>
          </div>
        </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Cross-domain "everything due" row (Feature 4). This page only
          covers topic revision above; DSA revision (dsa_progress) and
          interview weakness tracking (interview_weaknesses) live on their
          own pages with their own full UIs — this row just surfaces their
          real counts here too, with links out, so this page becomes the
          single place to see everything due without duplicating either
          page's logic. */}
      {(overdueDsaCount > 0 || weakConceptCount > 0) && (
        <FadeUp>
          <div className="rounded-card border border-border/60 bg-surface-2 p-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-xs text-muted uppercase tracking-wide">Also due</span>
            {overdueDsaCount > 0 && (
              <Link href="/dsa" className="text-danger hover:underline">
                {overdueDsaCount} DSA problem{overdueDsaCount === 1 ? "" : "s"} overdue for review
              </Link>
            )}
            {weakConceptCount > 0 && (
              <Link href="/interview-prep" className="text-accent hover:underline">
                {weakConceptCount} interview weakness{weakConceptCount === 1 ? "" : "es"} to close
              </Link>
            )}
          </div>
        </FadeUp>
      )}

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

      <StaggerContainer className="flex flex-col gap-2">
        {filtered.map((t) => {
          const reviewCount = t.progress?.review_count ?? 0;
          const tier = tierForReviewCount(reviewCount);
          const overdue = isOverdue(t.progress?.next_review_due ?? null);
          const due = t.progress?.next_review_due ?? null;
          const daysLeft = daysUntil(due);

          return (
            <StaggerItem key={t.id}>
            <Card
              className={cn(
                "transition-standard hover:border-muted-2/40 glow-card",
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
                  {t.progress?.last_confidence_rating && tier !== "mastered" && (
                    <p className="text-[11px] mt-1 text-muted">
                      Last felt: {CONFIDENCE_LABEL[t.progress.last_confidence_rating]}
                    </p>
                  )}
                </div>
                {tier !== "mastered" &&
                  (ratingTopicId === t.id ? (
                    <ConfidencePicker
                      onRate={(rating) => handleMarkReviewed(t.id, reviewCount, t.title, rating)}
                      onCancel={() => setRatingTopicId(null)}
                    />
                  ) : (
                    <Button size="sm" onClick={() => setRatingTopicId(t.id)}>
                      Review
                    </Button>
                  ))}
              </CardContent>
            </Card>
            </StaggerItem>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState message="Nothing due for revision." />
        )}
      </StaggerContainer>
    </div>
  );
}
