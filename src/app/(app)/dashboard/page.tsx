"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useExitLadder, useRoadmapMetadata } from "@/lib/hooks/use-roadmap";
import { useDailyLogs, computeStreak, weeklyHours, syncPublicStreakSummary } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { isOverdue } from "@/lib/revision-schedule";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useExerciseProgress } from "@/lib/hooks/use-exercises";
import { DailyMission } from "@/components/dashboard/daily-mission";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StudyHeatmap } from "@/components/dashboard/heatmap";
import { DashboardTour } from "@/components/dashboard/dashboard-tour";
import { RevisionDueWidget } from "@/components/dashboard/revision-due-widget";
import { useTopicDayMap, getManualDayForTopic } from "@/lib/hooks/use-manual-day";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { formatHours, pct, cn, localDateISO } from "@/lib/utils";
import { Flame, TrendingUp, Code2, Briefcase, FolderGit2, AlertCircle, ChevronDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";

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
  const { data: exerciseProgress } = useExerciseProgress(user?.id);
  // Daily Mission's status row (revisions/project/DSA) starts collapsed —
  // the next-topic block + one-line summary already answer "what do I do
  // right now," so this secondary detail is opt-in rather than always
  // taking up vertical space before the rest of the page. Auto-opens if
  // something in it actually needs attention (overdue revisions) so it
  // doesn't hide something urgent behind an extra click.
  const [missionDetailsOpen, setMissionDetailsOpen] = useState(false);
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

  // The stage containing nextTopic — Daily Mission scopes its exercise/
  // project checklist and curriculum-allocation-vs-logged display to this
  // stage (the spec's "16h stage" example), not to the single topic.
  const currentStage = useMemo(() => {
    if (!nextTopic) return null;
    for (const phase of phases) {
      for (const stage of phase.stages ?? []) {
        if (stage.topics.some((t) => t.id === nextTopic.topic.id)) return stage;
      }
    }
    return null;
  }, [phases, nextTopic]);

  const todaysLesson = useMemo(
    () => getManualDayForTopic(nextTopic?.topic.id, topicDayMap),
    [nextTopic, topicDayMap]
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

      {/* Daily Mission — the dashboard's visual anchor. Stage-scoped execution
          checkpoint: current position, exercises/project checklist, curriculum
          allocation vs actual logged time, and the log-time entry point, all
          in one place so "what do I do right now" never requires navigating
          elsewhere. */}
      <DailyMission
        userId={user?.id}
        nextTopic={nextTopic}
        currentStage={currentStage}
        exerciseProgress={exerciseProgress ?? []}
        projectProgress={projectProgress}
        orderedIncompleteTopics={orderedIncompleteTopics}
        todaysLesson={todaysLesson}
        yesterdaysLog={yesterdaysLog}
        onMutateProgress={mutateProgress}
        onMutateLogs={mutateLogs}
      />

      {/* Secondary status — revision/project/DSA nudges, collapsed by default
          per the "Daily Mission dominates" hierarchy. Not part of the mission
          itself since these are separate systems the spec says to keep but
          de-emphasize. */}
      {(overdueRevisions.length > 0 || currentProject || nextDsaProblem) && (
        <Card>
          <CardContent className="py-3">
            <button
              onClick={() => setMissionDetailsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-standard"
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
          </CardContent>
        </Card>
      )}

      {/* Streak + heatmap moved up here, directly under Daily Mission — these
          are the habit-driving pieces of the page (item #16), so they sit
          above the fold instead of after two other grids where they used
          to get buried. */}
      {/* Streak — the quick daily-log form that used to sit beside this was
          removed: it duplicated Daily Mission's "Log study time," which is
          now the one place sessions get logged from, per the spec's "use
          the existing system, don't create a second one." */}
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