"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useExitLadder, useRoadmapMetadata, toggleTopicComplete, applyHoursToNextTopic } from "@/lib/hooks/use-roadmap";
import { useDailyLogs, computeStreak, weeklyHours, logStudySession, syncPublicStreakSummary } from "@/lib/hooks/use-daily-logs";
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
import { TodaysLesson } from "@/components/dashboard/todays-lesson";
import { DashboardTour } from "@/components/dashboard/dashboard-tour";
import { RevisionDueWidget } from "@/components/dashboard/revision-due-widget";
import { useTopicDayMap, getManualDayForTopic } from "@/lib/hooks/use-manual-day";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { formatHours, pct, cn, localDateISO } from "@/lib/utils";
import { computePaceStatus } from "@/lib/pace";
import { toast } from "sonner";
import { Flame, Target, CheckCircle2, Clock, TrendingUp, Loader2, Code2, Briefcase, FolderGit2, AlertCircle, ChevronDown } from "lucide-react";
import Link from "next/link";

// Small SVG radial ring showing overall topic-completion percentage — sits
// beside the next-topic text in Daily Mission so today's action is framed
// against overall progress, not shown in isolation. Pure presentation, no
// new data dependency (reuses the same completedTopics/totalTopics values
// already computed for the stat cards further down the page).
function RadialMiniProgress({ value }: { value: number }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold font-mono-tabular">
        {Math.round(value)}%
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { data: userSettings } = useUserSettings(user?.id);
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
  // Daily Mission's status row (revisions/project/DSA) starts collapsed —
  // the next-topic block + one-line summary already answer "what do I do
  // right now," so this secondary detail is opt-in rather than always
  // taking up vertical space before the rest of the page. Auto-opens if
  // something in it actually needs attention (overdue revisions) so it
  // doesn't hide something urgent behind an extra click.
  const [missionDetailsOpen, setMissionDetailsOpen] = useState(false);
  // Today's Lesson — the manual's full "Day N" write-up for whatever topic
  // Daily Mission is pointing at, shown collapsed by default for the same
  // reason as the revision/project/DSA status row above: don't push the
  // rest of the dashboard down before the user asks for it.
  const [lessonOpen, setLessonOpen] = useState(false);
  const { data: topicDayMap } = useTopicDayMap();

  const allTopics = useMemo(() => phases.flatMap((p) => p.topics), [phases]);
  const completedTopics = allTopics.filter((t) => t.progress?.completed);
  const totalTopics = allTopics.length;
  const totalHours = allTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  const completedHours = completedTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);

  const orderedIncompleteTopics = useMemo(() => {
    // Same phase -> stage -> topic walk as nextTopic above, but returns the
    // full ordered chain rather than just the first — applyHoursToNextTopic
    // needs to know what comes after the current topic to roll overflow
    // hours forward when a log fills it.
    const candidates = phases.flatMap((phase, phaseIdx) =>
      (phase.stages ?? []).flatMap((stage, stageIdx) =>
        stage.topics.map((topic, topicIdx) => ({ topic, phaseIdx, stageIdx, topicIdx }))
      )
    );
    return candidates
      .filter((c) => !c.topic.progress?.completed)
      .sort((a, b) => {
        if (a.phaseIdx !== b.phaseIdx) return a.phaseIdx - b.phaseIdx;
        if (a.stageIdx !== b.stageIdx) return a.stageIdx - b.stageIdx;
        return a.topicIdx - b.topicIdx;
      })
      .map((c) => c.topic);
  }, [phases]);

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

  const todaysLesson = useMemo(
    () => getManualDayForTopic(nextTopic?.topic.id, topicDayMap),
    [nextTopic, topicDayMap]
  );

  const paceStatus = useMemo(
    () => computePaceStatus(phases, logs ?? [], nextTopic?.topic.id),
    [phases, logs, nextTopic]
  );

  const yesterdaysLog = useMemo(() => {
    if (!logs) return null;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yISO = localDateISO(y);
    return logs.find((l) => l.date === yISO) ?? null;
  }, [logs]);

  // Time-aware greeting for the dashboard hero — "Good Morning / Afternoon /
  // Evening" per the redesign spec. Computed once per render, not stored in
  // state, since it only needs to be roughly right (no live-updating clock).
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  const firstName = (() => {
    // Prefer the display name set in Settings (e.g. "Rohan") over deriving
    // one from the email local-part — the latter was the only behavior
    // before, which silently ignored whatever the user typed into
    // Settings' display name field, making it look like saving did nothing.
    if (userSettings?.display_name) {
      return userSettings.display_name.split(" ")[0];
    }
    const email = user?.email;
    if (!email) return null;
    const local = email.split("@")[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  })();

  const streak = computeStreak(logs ?? []);
  const weekHours = weeklyHours(logs ?? []);

  // Keeps public_streak_summary (the public-profile-safe streak signal)
  // in sync whenever logs change — see syncPublicStreakSummary for why
  // this is a separate table rather than exposing daily_logs publicly.
  // Fire-and-forget: failures are logged, not surfaced, since this is a
  // background sync unrelated to anything the user is actively doing here.
  useEffect(() => {
    if (!user || !logs) return;
    syncPublicStreakSummary(user.id, logs);
  }, [user, logs]);

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
    if (parts.length === 0) return "Nothing due yet — you're caught up.";
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

      // Apply the logged hours toward whatever topic Daily Mission is
      // currently pointing at (orderedIncompleteTopics[0]), rolling any
      // overflow into subsequent topics if this session fills one.
      if (orderedIncompleteTopics.length > 0) {
        const result = await applyHoursToNextTopic(user.id, orderedIncompleteTopics, hours);
        await mutateProgress();
        if (result.completedTopics.length > 0) {
          const names = result.completedTopics.map((t) => t.title).join(", ");
          toast.success(
            result.completedTopics.length === 1
              ? `Logged ${hours}h — completed "${names}"!`
              : `Logged ${hours}h — completed ${result.completedTopics.length} topics: ${names}!`
          );
        } else {
          toast.success(`Logged ${hours}h for today.`);
        }
      } else {
        toast.success(`Logged ${hours}h for today.`);
      }

      setLogHours("");
      setLogNote("");
    } catch {
      toast.error("Couldn't save log. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>

        {/* Daily Mission shape: badge+label row, title line, action button,
            collapse toggle, footer line — mirrors the real card below. */}
        <Card className="border-accent/30">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-10" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-9 w-36 shrink-0" />
            </div>
            <Skeleton className="h-3 w-48 mt-1" />
            <Skeleton className="h-3 w-2/3 mt-1" />
          </CardContent>
        </Card>

        {/* Streak/log block — moved up to mirror the real page's new order
            (item #16), so the skeleton shape matches what actually loads. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent noHeader className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32 mt-1" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Heatmap */}
        <Card>
          <CardContent noHeader className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full mt-1" />
          </CardContent>
        </Card>

        {/* Engineering OS 3-card stat grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent noHeader className="flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-32 mt-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Daily Mission's status row shows if the user opened it, OR if
  // something in it is actually urgent (overdue revisions) — so an urgent
  // item is never silently hidden behind a collapsed toggle.
  const missionDetailsEffectivelyOpen = missionDetailsOpen || overdueRevisions.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {user && userSettings && userSettings.dashboard_tour_seen === false && (
        <DashboardTour userId={user.id} />
      )}

      <div>
        <h1 className="text-page-title font-semibold tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-muted mt-1">Ship the roadmap. One topic at a time.</p>
      </div>

      {/* Daily Mission — the dashboard's visual anchor per the redesign spec.
          Bigger surface, warm accent glow, and a radial progress ring in
          place of the plain phase badge so today's overall standing is
          visible at a glance, not just the single next topic. */}
      <Card className="relative overflow-hidden border-accent/30 shadow-lg shadow-accent/5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        />
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <CardTitle size="lg">Daily Mission</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="relative flex flex-col gap-4">
          {nextTopic ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <RadialMiniProgress value={pct(completedTopics.length, totalTopics)} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="accent">{nextTopic.phase.phase_number}</Badge>
                    <span className="text-xs text-muted">{nextTopic.phase.title}</span>
                    {paceStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-normal",
                          paceStatus.status === "ahead" && "text-success border-success/40",
                          paceStatus.status === "behind" && "text-warning border-warning/40"
                        )}
                        title={`${formatHours(Math.abs(paceStatus.deltaHours))} ${
                          paceStatus.status === "behind" ? "behind" : "ahead of"
                        } where the roadmap's estimated hours put you`}
                      >
                        {paceStatus.status === "on-pace"
                          ? "On pace"
                          : paceStatus.status === "ahead"
                            ? `${formatHours(paceStatus.deltaHours)} ahead`
                            : `${formatHours(Math.abs(paceStatus.deltaHours))} behind`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-card-title font-semibold">{nextTopic.topic.title}</p>
                  {nextTopic.topic.estimated_hours && (
                    <>
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatHours((nextTopic.topic.progress?.actual_minutes_spent ?? 0) / 60)} /{" "}
                        {formatHours(nextTopic.topic.estimated_hours)} logged
                      </p>
                      <div className="h-1.5 w-40 rounded-full bg-border overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-accent rounded-full transition-standard"
                          style={{
                            width: `${Math.min(
                              100,
                              ((nextTopic.topic.progress?.actual_minutes_spent ?? 0) /
                                (nextTopic.topic.estimated_hours * 60)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Button onClick={handleCompleteNext} disabled={completing} size="lg" className="shrink-0">
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Mark complete
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">All topics complete. You&apos;ve finished the roadmap. 🎉</p>
          )}

          {(overdueRevisions.length > 0 || currentProject || nextDsaProblem) && (
            <div className="pt-1 border-t border-border">
              <button
                onClick={() => setMissionDetailsOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground pt-3 transition-standard"
                aria-expanded={missionDetailsEffectivelyOpen}
              >
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", missionDetailsEffectivelyOpen && "rotate-180")}
                />
                {missionDetailsEffectivelyOpen ? "Hide details" : "Show revision, project & DSA status"}
              </button>
              {missionDetailsEffectivelyOpen && (
                <div className="flex flex-col gap-3 pt-3">
                  {overdueRevisions.length > 0 && (
                    <RevisionDueWidget
                      userId={user?.id ?? ""}
                      overdueTopics={overdueRevisions}
                      onReviewed={mutateProgress}
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {overdueRevisions.length === 0 && (
                      <Link href="/revision" className="flex items-center gap-2 text-xs hover:text-accent transition-standard">
                        <AlertCircle className="h-3.5 w-3.5 text-muted shrink-0" />
                        <span className="text-info">Revisions up to date</span>
                      </Link>
                    )}
                    <Link href="/projects" className="flex items-center gap-2 text-xs hover:text-accent transition-standard">
                      <FolderGit2 className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="text-muted truncate">
                        {currentProject ? currentProject.phase.title : "No project in progress"}
                      </span>
                    </Link>
                    <Link href="/dsa" className="flex items-center gap-2 text-xs hover:text-accent transition-standard">
                      <Code2 className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="text-muted truncate">
                        {nextDsaProblem ? nextDsaProblem.problem_name : "No DSA problems yet"}
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {todaysLesson && (
            <div className="pt-1 border-t border-border">
              <button
                onClick={() => setLessonOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground pt-3 transition-standard"
                aria-expanded={lessonOpen}
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", lessonOpen && "rotate-180")} />
                {lessonOpen ? "Hide today's lesson" : "Show today's lesson"}
              </button>
              {lessonOpen && (
                <div className="pt-3">
                  <TodaysLesson day={todaysLesson} userId={user?.id} yesterdaysLog={yesterdaysLog} />
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted italic pt-1 border-t border-border">
            <span className="font-medium not-italic text-foreground">Today: </span>
            {missionOutcome}
          </p>
        </CardContent>
      </Card>

      {/* Streak + heatmap moved up here, directly under Daily Mission — these
          are the habit-driving pieces of the page (item #16), so they sit
          above the fold instead of after two other grids where they used
          to get buried. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <p className="text-hero text-4xl font-bold font-mono-tabular leading-none">{streak.current}</p>
                <p className="text-xs text-muted mt-2">current streak</p>
              </div>
              <div>
                <p className="text-4xl font-bold font-mono-tabular text-muted leading-none">{streak.best}</p>
                <p className="text-xs text-muted mt-2">best streak</p>
              </div>
            </div>
            <p className="text-xs text-muted mt-4">{weekHours.toFixed(1)}h logged this week</p>
          </CardContent>
        </Card>

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

      {/* Engineering OS panel — the pieces the dashboard was missing:
          what you're actively building, DSA standing, and applications out. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-accent/15 text-secondary-accent">
                <FolderGit2 className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Current project</p>
            </div>
            {currentProject ? (
              <>
                <p className="text-sm font-semibold">
                  Phase {currentProject.phase.phase_number} — {currentProject.phase.title}
                </p>
                <Link href="/projects" className="text-xs text-accent hover:underline mt-1 inline-block">
                  View in Projects →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">No project in progress yet</p>
                <Link href="/projects" className="text-xs text-accent hover:underline mt-1 inline-block">
                  Start one →
                </Link>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15 text-highlight">
                <Code2 className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">DSA progress</p>
            </div>
            <p className="text-sm font-semibold font-mono-tabular">
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
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-reward/15 text-reward">
                <Briefcase className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Applications</p>
            </div>
            <p className="text-sm font-semibold font-mono-tabular">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent noHeader>
            <p className="text-xs text-muted mb-2">Topics completed</p>
            <p className="text-3xl font-bold font-mono-tabular leading-none">
              {completedTopics.length}
              <span className="text-sm text-muted font-normal"> / {totalTopics}</span>
            </p>
            <Progress value={pct(completedTopics.length, totalTopics)} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent noHeader>
            <p className="text-xs text-muted mb-2">Hours logged</p>
            <p className="text-3xl font-bold font-mono-tabular leading-none">
              {formatHours(completedHours)}
              <span className="text-sm text-muted font-normal"> / {formatHours(totalHours)}</span>
            </p>
            <Progress value={pct(completedHours, totalHours)} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Current exit point</p>
            </div>
            {currentExit ? (
              <>
                <p className="text-3xl font-bold leading-none">{currentExit.exit_code}</p>
                <p className="text-xs text-muted mt-2">{currentExit.job_level}</p>
              </>
            ) : (
              <p className="text-sm text-muted mt-1">No exit point reached yet</p>
            )}
            {nextExit && (
              <p className="text-xs text-accent mt-2">
                Next: {nextExit.exit_code} — {nextExit.job_level}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

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