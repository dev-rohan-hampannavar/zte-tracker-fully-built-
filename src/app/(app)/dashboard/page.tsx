"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useExitLadder, useRoadmapMetadata, toggleTopicComplete } from "@/lib/hooks/use-roadmap";
import { useDailyLogs, computeStreak, weeklyHours, logStudySession } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { isOverdue } from "@/lib/revision-schedule";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StudyHeatmap } from "@/components/dashboard/heatmap";
import { formatHours, pct } from "@/lib/utils";
import { toast } from "sonner";
import { Flame, Target, CheckCircle2, Clock, TrendingUp, Loader2, Code2, Briefcase, FolderGit2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useUser();
  const { phases, isLoading, mutateProgress } = usePhasesWithProgress(user?.id);
  const { data: exitLadder } = useExitLadder();
  const { data: logs, mutate: mutateLogs } = useDailyLogs(user?.id);
  const { data: metadata } = useRoadmapMetadata();
  const { data: dsaProblems } = useDsaProgress(user?.id);
  const { data: applications } = useCareerTracker(user?.id);
  const { data: projectProgress } = useProjectProgress(user?.id);
  const [logHours, setLogHours] = useState("");
  const [logNote, setLogNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const allTopics = useMemo(() => phases.flatMap((p) => p.topics), [phases]);
  const completedTopics = allTopics.filter((t) => t.progress?.completed);
  const totalTopics = allTopics.length;
  const totalHours = allTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  const completedHours = completedTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);

  const nextTopic = useMemo(() => {
    // Walk phase -> stage -> topic (not the flat phase.topics list). Topics
    // within a phase are ordered by their own order_index, which is NOT
    // guaranteed to respect stage order — a later-stage topic can have a
    // lower order_index than an earlier-stage one, which was causing Daily
    // Mission to jump ahead of the actual next topic on the Roadmap.
    //
    // Written as flatMap + sort + find rather than nested for-loops with an
    // early return — the raw loop form causes the React Compiler to skip
    // memoization for this whole component (same fix already applied to
    // currentProject/nextExercise below).
    const candidates = phases.flatMap((phase, phaseIdx) =>
      (phase.stages ?? []).flatMap((stage, stageIdx) =>
        stage.topics.map((topic, topicIdx) => ({ topic, phase, phaseIdx, stageIdx, topicIdx }))
      )
    );
    const next = candidates
      .filter((c) => !c.topic.progress?.completed)
      .sort((a, b) => {
        if (a.phaseIdx !== b.phaseIdx) return a.phaseIdx - b.phaseIdx;
        if (a.stageIdx !== b.stageIdx) return a.stageIdx - b.stageIdx;
        return a.topicIdx - b.topicIdx;
      })[0];
    return next ? { topic: next.topic, phase: next.phase } : null;
  }, [phases]);

  const streak = computeStreak(logs ?? []);
  const weekHours = weeklyHours(logs ?? []);

  // "Engineering OS" panel (P7.5 item 21): the dashboard already covers
  // "continue X" (Daily Mission below, pre-existing) — these three add the
  // pieces the doc calls out that weren't visible anywhere on this page:
  // today's DSA state, applications sent, and the current in-progress
  // project. DSA problems have no completed_at timestamp in the schema, so
  // "today's DSA" honestly means overall progress toward the roadmap's own
  // easy/medium targets (from roadmap_metadata, P7.0), not "solved today" —
  // that finer-grained signal doesn't exist in the data.
  const dsaEasyDone = (dsaProblems ?? []).filter((p) => p.difficulty === "easy" && p.completed).length;
  const dsaMediumDone = (dsaProblems ?? []).filter((p) => p.difficulty === "medium" && p.completed).length;
  const dsaHardDone = (dsaProblems ?? []).filter((p) => p.difficulty === "hard" && p.completed).length;

  const activeApplications = useMemo(
    () =>
      (applications ?? []).filter((a) =>
        ["applied", "screening", "interviewing"].includes(a.application_status)
      ),
    [applications]
  );
  const offersCount = (applications ?? []).filter((a) => a.offer).length;

  const currentProject = useMemo(() => {
    const inProgress = (projectProgress ?? []).find((p) => p.status === "in_progress");
    if (!inProgress) return null;
    const phase = phases.find((p) => p.id === inProgress.phase_id);
    return phase ? { phase, progress: inProgress } : null;
  }, [projectProgress, phases]);

  // Item 32 — Daily Mission, full version: overdue revisions, current
  // project, and a next-unsolved-DSA nudge all folded into one mission,
  // plus a one-line generated outcome summary. Nothing here is a new
  // fetch — revision due dates ride on topic.progress (already fetched by
  // usePhasesWithProgress), currentProject and dsaProblems are already
  // computed above/nearby for the Engineering OS panel.
  const overdueRevisions = useMemo(
    () => allTopics.filter((t) => t.progress?.completed && isOverdue(t.progress?.next_review_due ?? null)),
    [allTopics]
  );

  const nextDsaProblem = useMemo(
    () => (dsaProblems ?? []).find((p) => !p.completed) ?? null,
    [dsaProblems]
  );

  const missionOutcome = useMemo(() => {
    const parts: string[] = [];
    if (nextTopic) parts.push(`finish "${nextTopic.topic.title}"`);
    if (overdueRevisions.length > 0) {
      parts.push(`review ${overdueRevisions.length} overdue item${overdueRevisions.length === 1 ? "" : "s"}`);
    }
    if (nextDsaProblem) parts.push(`log 1 DSA problem (${nextDsaProblem.problem_name})`);
    if (currentProject) parts.push(`push ${currentProject.phase.title} forward`);
    if (parts.length === 0) return "Nothing queued — you're caught up.";
    return parts.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".";
  }, [nextTopic, overdueRevisions, nextDsaProblem, currentProject]);

  const currentExit = useMemo(() => {
    if (!exitLadder) return null;
    // Current = highest exit whose linked phase is fully completed
    let current = null;
    for (const e of exitLadder) {
      const linkedPhase = phases.find((p) => p.id === e.linked_phase);
      if (linkedPhase && linkedPhase.topics.length > 0 && linkedPhase.topics.every((t) => t.progress?.completed)) {
        current = e;
      }
    }
    return current;
  }, [exitLadder, phases]);

  const nextExit = useMemo(() => {
    if (!exitLadder || !currentExit) return exitLadder?.[0] ?? null;
    const idx = exitLadder.findIndex((e) => e.exit_code === currentExit.exit_code);
    return exitLadder[idx + 1] ?? null;
  }, [exitLadder, currentExit]);

  async function handleCompleteNext() {
    if (!user || !nextTopic) return;
    setCompleting(true);
    try {
      await toggleTopicComplete(user.id, nextTopic.topic.id, true);
      await mutateProgress();
      toast.success(`Marked "${nextTopic.topic.title}" complete`);
    } catch {
      toast.error("Couldn't update. Try again.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleLogSession(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const hours = parseFloat(logHours);
    if (!hours || hours <= 0) {
      toast.error("Enter a valid number of hours.");
      return;
    }
    setSubmitting(true);
    try {
      await logStudySession(user.id, hours, logNote || undefined);
      await mutateLogs();
      setLogHours("");
      setLogNote("");
      toast.success(`Logged ${hours}h for today.`);
    } catch {
      toast.error("Couldn't save log. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted">Ship the roadmap. One topic at a time.</p>
      </div>

      {/* Daily Mission */}
      <Card className="border-accent/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <CardTitle size="lg">Daily Mission</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {nextTopic ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="accent">{nextTopic.phase.phase_number}</Badge>
                  <span className="text-xs text-muted">{nextTopic.phase.title}</span>
                </div>
                <p className="text-lg font-semibold">{nextTopic.topic.title}</p>
                {nextTopic.topic.estimated_hours && (
                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ~{formatHours(nextTopic.topic.estimated_hours)} estimated
                  </p>
                )}
              </div>
              <Button onClick={handleCompleteNext} disabled={completing}>
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark complete
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">All topics complete. You&apos;ve finished the roadmap. 🎉</p>
          )}

          {(overdueRevisions.length > 0 || currentProject || nextDsaProblem) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border">
              <Link
                href="/revision"
                className="flex items-center gap-2 text-xs pt-3 hover:text-accent transition-colors"
              >
                <AlertCircle className="h-3.5 w-3.5 text-muted shrink-0" />
                <span className={overdueRevisions.length > 0 ? "text-warning" : "text-info"}>
                  {overdueRevisions.length > 0
                    ? `${overdueRevisions.length} revision${overdueRevisions.length === 1 ? "" : "s"} overdue`
                    : "Revisions up to date"}
                </span>
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-2 text-xs pt-3 hover:text-accent transition-colors"
              >
                <FolderGit2 className="h-3.5 w-3.5 text-muted shrink-0" />
                <span className="text-muted truncate">
                  {currentProject ? currentProject.phase.title : "No project in progress"}
                </span>
              </Link>
              <Link href="/dsa" className="flex items-center gap-2 text-xs pt-3 hover:text-accent transition-colors">
                <Code2 className="h-3.5 w-3.5 text-muted shrink-0" />
                <span className="text-muted truncate">
                  {nextDsaProblem ? nextDsaProblem.problem_name : "No DSA problems queued"}
                </span>
              </Link>
            </div>
          )}

          <p className="text-xs text-muted italic pt-1 border-t border-border">
            <span className="font-medium not-italic text-foreground">Today: </span>
            {missionOutcome}
          </p>
        </CardContent>
      </Card>

      {/* Engineering OS panel — the pieces the dashboard was missing:
          what you're actively building, DSA standing, and applications out. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <FolderGit2 className="h-3 w-3" /> Current project
            </p>
            {currentProject ? (
              <>
                <p className="text-sm font-semibold mt-1">
                  Phase {currentProject.phase.phase_number} — {currentProject.phase.title}
                </p>
                <Link href="/projects" className="text-xs text-accent hover:underline mt-1 inline-block">
                  View in Projects →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted mt-1">Nothing marked in progress</p>
                <Link href="/projects" className="text-xs text-accent hover:underline mt-1 inline-block">
                  Start one →
                </Link>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <Code2 className="h-3 w-3" /> DSA progress
            </p>
            <p className="text-sm font-semibold mt-1 font-mono-tabular">
              {dsaEasyDone}/{metadata?.dsa_easy_target ?? "—"} easy · {dsaMediumDone}/
              {metadata?.dsa_medium_target ?? "—"} medium
              {dsaHardDone > 0 && ` · ${dsaHardDone} hard`}
            </p>
            <Link href="/dsa" className="text-xs text-accent hover:underline mt-1 inline-block">
              Open DSA tracker →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> Applications
            </p>
            <p className="text-sm font-semibold mt-1 font-mono-tabular">
              {activeApplications.length} active
              {offersCount > 0 && (
                <span className="text-success"> · {offersCount} offer{offersCount === 1 ? "" : "s"}</span>
              )}
            </p>
            <Link href="/career" className="text-xs text-accent hover:underline mt-1 inline-block">
              Open career tracker →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's log */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s study log</CardTitle>
            <CardDescription>Log hours as you go — sessions add up across the day.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogSession} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="Hours"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  className="w-28"
                />
                <Input
                  placeholder="Note (optional)"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button type="submit" disabled={submitting} variant="secondary">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save log
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" />
              <CardTitle>Streak</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              <div>
                <p className="text-3xl font-bold font-mono-tabular">{streak.current}</p>
                <p className="text-xs text-muted">current streak</p>
              </div>
              <div>
                <p className="text-3xl font-bold font-mono-tabular text-muted">{streak.best}</p>
                <p className="text-xs text-muted">best streak</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-3">{weekHours.toFixed(1)}h logged this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1">Topics completed</p>
            <p className="text-2xl font-bold font-mono-tabular">
              {completedTopics.length}
              <span className="text-sm text-muted font-normal"> / {totalTopics}</span>
            </p>
            <Progress value={pct(completedTopics.length, totalTopics)} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1">Hours logged</p>
            <p className="text-2xl font-bold font-mono-tabular">
              {formatHours(completedHours)}
              <span className="text-sm text-muted font-normal"> / {formatHours(totalHours)}</span>
            </p>
            <Progress value={pct(completedHours, totalHours)} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Current exit point
            </p>
            {currentExit ? (
              <>
                <p className="text-2xl font-bold">{currentExit.exit_code}</p>
                <p className="text-xs text-muted mt-1">{currentExit.job_level}</p>
              </>
            ) : (
              <p className="text-sm text-muted mt-2">Not reached yet</p>
            )}
            {nextExit && (
              <p className="text-xs text-accent mt-2">
                Next: {nextExit.exit_code} — {nextExit.job_level}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Study heatmap</CardTitle>
          <CardDescription>Last 12 months of logged sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudyHeatmap logs={logs ?? []} />
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {completedTopics
              .filter((t) => t.progress?.completed_at)
              .sort((a, b) => (b.progress!.completed_at! > a.progress!.completed_at! ? 1 : -1))
              .slice(0, 6)
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    {t.title}
                  </span>
                  <span className="text-xs text-muted font-mono-tabular">
                    {new Date(t.progress!.completed_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            {completedTopics.length === 0 && (
              <p className="text-sm text-muted">
                No topics completed yet. Head to the{" "}
                <Link href="/roadmap" className="text-accent hover:underline">
                  roadmap
                </Link>{" "}
                and start Phase 01.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}