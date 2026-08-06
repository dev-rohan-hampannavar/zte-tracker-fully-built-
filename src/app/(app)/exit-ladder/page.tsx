"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useExitLadder, usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useDisplayName } from "@/lib/hooks/use-display-name";
import { downloadCertificate } from "@/lib/certificate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  ListChecks,
  Trophy,
  Award,
} from "lucide-react";
import type { PhaseWithTopics } from "@/types/database";

type RungStatus = "complete" | "current" | "locked";

type Rung = {
  exitCode: string;
  linkedPhase: string | null;
  jobLevel: string | null;
  salaryRange: string | null;
  targetCompanies: string | null;
  highlights: string | null;
  status: RungStatus;
  /** Topics completed / total across every phase up to and including this rung's linked phase. */
  cumulativeCompleted: number;
  cumulativeTotal: number;
  /** Phase titles this rung adds on top of the previous rung — "skills unlocked". */
  skillsUnlocked: string[];
  /** For a locked rung: what's left to reach it. */
  remainingTopics: number;
  remainingPhaseTitles: string[];
  capstoneNames: string[];
};

function phaseOrderIndex(phases: PhaseWithTopics[], phaseId: string | null) {
  if (!phaseId) return -1;
  return phases.findIndex((p) => p.id === phaseId);
}

export default function ExitLadderPage() {
  const { user } = useUser();
  const { data: displayName } = useDisplayName(user?.id);
  const { data: exitLadder, isLoading: ladderLoading } = useExitLadder();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);

  const rungs: Rung[] = useMemo(() => {
    if (!exitLadder || phases.length === 0) return [];

    const orderedPhases = [...phases].sort((a, b) => a.order_index - b.order_index);

    let prevCutoffIndex = -1;
    let firstIncompleteFound = false;

    return exitLadder.map((exit) => {
      const cutoffIndex = phaseOrderIndex(orderedPhases, exit.linked_phase);
      const phasesUpToHere = cutoffIndex >= 0 ? orderedPhases.slice(0, cutoffIndex + 1) : [];

      let completed = 0;
      let total = 0;
      for (const phase of phasesUpToHere) {
        for (const t of phase.topics) {
          total += 1;
          if (t.progress?.completed) completed += 1;
        }
      }

      const isComplete = total > 0 && completed === total;

      const skillsUnlocked = phasesUpToHere
        .slice(prevCutoffIndex + 1)
        .map((p) => p.title);

      const capstoneNames = phasesUpToHere
        .slice(prevCutoffIndex + 1)
        .map((p) => p.capstone?.title)
        .filter((t): t is string => !!t);

      let status: RungStatus;
      if (isComplete) {
        status = "complete";
      } else if (!firstIncompleteFound) {
        status = "current";
        firstIncompleteFound = true;
      } else {
        status = "locked";
      }

      const remainingPhaseTitles = phasesUpToHere
        .filter((p) => p.topics.length > 0 && !p.topics.every((t) => t.progress?.completed))
        .map((p) => p.title);

      prevCutoffIndex = cutoffIndex;

      return {
        exitCode: exit.exit_code,
        linkedPhase: exit.linked_phase,
        jobLevel: exit.job_level,
        salaryRange: exit.salary_range,
        targetCompanies: exit.target_companies,
        highlights: exit.highlights,
        status,
        cumulativeCompleted: completed,
        cumulativeTotal: total,
        skillsUnlocked,
        remainingTopics: total - completed,
        remainingPhaseTitles,
        capstoneNames,
      };
    });
  }, [exitLadder, phases]);

  if (ladderLoading || phasesLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const currentRung = rungs.find((r) => r.status === "current");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Exit Ladder</h1>
        <p className="text-sm text-muted mt-1">
          Real job-readiness milestones. Apply at Exit A, B, or ★1 — don&apos;t wait for the end.
        </p>
      </div>

      {currentRung && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent noHeader className="flex items-center gap-4 flex-wrap">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold">
                Next up: Exit {currentRung.exitCode} — {currentRung.jobLevel}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {currentRung.remainingTopics} topic{currentRung.remainingTopics === 1 ? "" : "s"} remaining
                {currentRung.remainingPhaseTitles.length > 0 &&
                  ` across ${currentRung.remainingPhaseTitles.length} phase${currentRung.remainingPhaseTitles.length === 1 ? "" : "s"}`}
                .
              </p>
            </div>
            {currentRung.cumulativeTotal > 0 && (
              <div className="w-full sm:w-40 shrink-0">
                <Progress
                  value={(currentRung.cumulativeCompleted / currentRung.cumulativeTotal) * 100}
                  className="h-2"
                />
                <p className="text-[11px] text-muted mt-1 font-mono-tabular text-right">
                  {currentRung.cumulativeCompleted}/{currentRung.cumulativeTotal}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="relative flex flex-col gap-3">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
        {rungs.map((rung) => {
          const pct =
            rung.cumulativeTotal > 0
              ? Math.round((rung.cumulativeCompleted / rung.cumulativeTotal) * 100)
              : 0;

          return (
            <div key={rung.exitCode} className="relative flex gap-4 pl-0">
              <div
                className={cn(
                  "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-mono-tabular text-xs font-bold",
                  rung.status === "complete" && "border-success bg-success/15 text-success",
                  rung.status === "current" && "border-accent bg-accent/15 text-accent",
                  rung.status === "locked" && "border-border bg-surface text-muted"
                )}
              >
                {rung.status === "complete" && <CheckCircle2 className="h-5 w-5" />}
                {rung.status === "current" && <span>{pct}%</span>}
                {rung.status === "locked" && <Lock className="h-4 w-4" />}
              </div>

              <Link href={`/roadmap#${rung.linkedPhase}`} className="flex-1">
                <Card
                  interactive
                  className={cn(
                    rung.status === "current" && "border-accent/50 bg-accent/5",
                    rung.status === "locked" && "opacity-70"
                  )}
                >
                  <CardContent noHeader className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          rung.status === "complete"
                            ? "success"
                            : rung.status === "current"
                              ? "accent"
                              : "outline"
                        }
                        className="font-mono-tabular"
                      >
                        Exit {rung.exitCode}
                      </Badge>
                      {rung.status === "current" && <Badge variant="accent">You are here</Badge>}
                      {rung.status === "locked" && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-2.5 w-2.5" /> Locked
                        </Badge>
                      )}
                      <span className="font-semibold text-sm">{rung.jobLevel}</span>
                      <ArrowRight className="h-3 w-3 text-muted" />
                      <span className="text-sm text-accent font-mono-tabular">{rung.salaryRange}</span>
                      {rung.status === "complete" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto h-7 gap-1 text-xs shrink-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            downloadCertificate({
                              displayName: displayName ?? null,
                              milestoneTitle: `${rung.jobLevel} — ${rung.salaryRange}`,
                              milestoneSubtitle: `Exit Point ${rung.exitCode}`,
                            });
                          }}
                        >
                          <Award className="h-3.5 w-3.5" /> Certificate
                        </Button>
                      )}
                    </div>

                    {rung.targetCompanies && (
                      <p className="text-xs text-muted -mt-1">Target: {rung.targetCompanies}</p>
                    )}
                    {rung.highlights && (
                      <p className="text-xs text-foreground/80">{rung.highlights}</p>
                    )}

                    {rung.cumulativeTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[11px] text-muted font-mono-tabular shrink-0">
                          {rung.cumulativeCompleted}/{rung.cumulativeTotal}
                        </span>
                      </div>
                    )}

                    {rung.skillsUnlocked.length > 0 && (
                      <div>
                        <p className="text-[11px] text-muted mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Skills unlocked at this rung
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rung.skillsUnlocked.map((title) => (
                            <Badge key={title} variant="outline" className="text-[11px] font-normal">
                              {title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rung.capstoneNames.length > 0 && (
                      <div>
                        <p className="text-[11px] text-muted mb-1 flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Capstone{rung.capstoneNames.length > 1 ? "s" : ""} at this rung
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rung.capstoneNames.map((name) => (
                            <Badge key={name} variant="outline" className="text-[11px] font-normal">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rung.status === "locked" && rung.remainingPhaseTitles.length > 0 && (
                      <div className="pt-1 border-t border-border/60">
                        <p className="text-[11px] text-muted mb-1 flex items-center gap-1">
                          <ListChecks className="h-3 w-3" /> {rung.remainingTopics} topic
                          {rung.remainingTopics === 1 ? "" : "s"} remaining to reach this exit
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rung.remainingPhaseTitles.map((title) => (
                            <Badge key={title} variant="outline" className="text-[11px] font-normal text-muted">
                              {title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}