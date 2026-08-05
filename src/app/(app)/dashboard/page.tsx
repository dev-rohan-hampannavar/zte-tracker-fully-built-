"use client";

import { useMemo, useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useExitLadder, useRoadmapMetadata, useClientSyncMilestones, toggleTopicComplete, updateTopicProgress } from "@/lib/hooks/use-roadmap";
import { useDailyLogs, computeStreak, weeklyHours, logStudySession } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useExerciseProgress, toggleExerciseComplete } from "@/lib/hooks/use-exercises";
import { isOverdue, daysUntil } from "@/lib/revision-schedule";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useProjectProgress, useBuildInPublicStatus } from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StudyHeatmap } from "@/components/dashboard/heatmap";
import { formatHours, pct, todayISO } from "@/lib/utils";
import { toast } from "sonner";
import { Flame, Target, CheckCircle2, Clock, TrendingUp, Loader2, Code2, Briefcase, FolderGit2, AlertCircle, ArrowRight, Quote, Calendar, Dumbbell, Megaphone } from "lucide-react";
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
  const { data: milestones } = useClientSyncMilestones();
  const { data: exerciseProgress, mutate: mutateExerciseProgress } = useExerciseProgress(user?.id);
  const { data: buildInPublicStatus } = useBuildInPublicStatus(user?.id);
  const [logHours, setLogHours] = useState("");
  const [logNote, setLogNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [applyingPlan, setApplyingPlan] = useState(false);
  const [completingExercise, setCompletingExercise] = useState(false);

  // Daily Mission — hours budget for today. Persisted to localStorage keyed
  // by today's date, so a refresh doesn't lose it but a new day starts
  // blank (this is a same-day planning input, not historical data worth a
  // topic_progress/daily_logs column — it never needs to be queried,
  // compared across days, or synced to another device).
  //
  // Reads the saved value via useState's lazy initializer (runs once,
  // synchronously, before first paint) instead of an effect that calls
  // setState on mount — the latter causes an extra render pass and trips
  // the React Compiler's set-state-in-effect check for good reason: it's
  // a real (if minor) render waste, and the initializer form avoids it
  // entirely for a value that's only ever read once per mount anyway.
  const todayKey = `zte-hours-budget-${new Date().toDateString()}`;
  const [hoursBudget, setHoursBudget] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(todayKey) ?? "";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hoursBudget) window.localStorage.setItem(todayKey, hoursBudget);
    else window.localStorage.removeItem(todayKey);
  }, [hoursBudget, todayKey]);

  const allTopics = useMemo(() => phases.flatMap((p) => p.topics), [phases]);
  const completedTopics = allTopics.filter((t) => t.progress?.completed);
  const totalTopics = allTopics.length;
  const totalHours = allTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  const completedHours = completedTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);

  // Already sequence-correct: phases come from roadmap.phases (ordered by
  // order_index) and each phase's topics come from roadmap.topics filtered
  // to that phase (also ordered by order_index) — see usePhasesWithProgress.
  // Walking phases -> topics in this nested order and returning the first
  // incomplete one is exactly "the next thing in roadmap sequence."
  //
  // Written as find() over a flattened, index-tagged list rather than a
  // nested for-loop with an early return — same
  // react-hooks/preserve-manual-memoization fix applied to currentProject
  // and nextExercise below; the raw loop form silently disables the React
  // Compiler's optimization for this whole component, not just this value.
  const nextTopic = useMemo(() => {
    // Walk phase -> stage -> topic (not the flat phase.topics list). Topics
    // within a phase are ordered by their own order_index, which is NOT
    // guaranteed to respect stage order — a later-stage topic (e.g. HTML5
    // in Stage 2) can carry a lower order_index than an earlier-stage one
    // (e.g. VS Code in Stage 1), which was causing Daily Mission to surface
    // the wrong "next" topic — one the Roadmap page hadn't actually reached
    // yet, since Roadmap correctly groups by stage first.
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

  // Today's plan: given the hours budget, walk incomplete topics in
  // roadmap sequence (same order nextTopic uses) and greedily fill the
  // budget. A topic that doesn't fully fit gets split — the hours that DO
  // fit are "today," the rest carries to tomorrow. Topics with no
  // estimated_hours (roadmap.md doesn't give every topic an estimate) are
  // skipped from the budget math entirely — including one would either
  // under- or over-count the budget on a made-up number, so instead it's
  // surfaced separately as "no estimate, do it after budgeted topics."
  //
  // "Remaining hours" per topic accounts for actual_minutes_spent already
  // logged against it (e.g. you did 2 of a 4-hour topic yesterday, logged
  // via the topic detail sheet — today's plan only owes you the other 2).
  type PlanEntry = {
    topic: (typeof allTopics)[number];
    phase: (typeof phases)[number];
    remainingHoursBefore: number;
    hoursToday: number;
    fullyFits: boolean;
  };
  const todaysPlan = useMemo(() => {
    const budget = parseFloat(hoursBudget);
    if (!budget || budget <= 0) return null;

    const entries: PlanEntry[] = [];
    const skippedNoEstimate: { topic: (typeof allTopics)[number]; phase: (typeof phases)[number] }[] = [];
    let remainingBudget = budget;

    outer: for (const phase of phases) {
      for (const topic of phase.topics) {
        if (topic.progress?.completed) continue;
        if (remainingBudget <= 0) break outer;

        if (!topic.estimated_hours) {
          skippedNoEstimate.push({ topic, phase });
          continue;
        }

        const alreadyLoggedHours = (topic.progress?.actual_minutes_spent ?? 0) / 60;
        const remainingHoursBefore = Math.max(topic.estimated_hours - alreadyLoggedHours, 0);
        if (remainingHoursBefore <= 0) continue; // fully logged but not yet marked complete

        const hoursToday = Math.min(remainingHoursBefore, remainingBudget);
        entries.push({
          topic,
          phase,
          remainingHoursBefore,
          hoursToday,
          fullyFits: hoursToday >= remainingHoursBefore,
        });
        remainingBudget -= hoursToday;
      }
    }

    return {
      entries,
      skippedNoEstimate,
      totalPlanned: entries.reduce((s, e) => s + e.hoursToday, 0),
      budget,
    };
  }, [hoursBudget, phases]);

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

  // Daily Mission follow-up fix: when multiple projects are "in_progress"
  // at once, this used to take whichever row Postgres happened to return
  // first for an unordered query — meaning the mission could point at a
  // later-phase project while the person's next unfinished topic sits in
  // an earlier phase, contradicting the roadmap's own sequence. Now it
  // walks `phases` in roadmap order (the same order `nextTopic` already
  // follows below) and takes the first in-progress project it finds —
  // i.e. the earliest-in-sequence one, not an arbitrary one.
  //
  // Written as find() over a Map lookup rather than a for-loop with an
  // early return — functionally identical, but the React Compiler can
  // trace this shape for memoization preservation where it couldn't
  // trace the raw loop (react-hooks/preserve-manual-memoization).
  const currentProject = useMemo(() => {
    const inProgressByPhase = new Map((projectProgress ?? []).filter((p) => p.status === "in_progress").map((p) => [p.phase_id, p]));
    const phase = phases.find((p) => inProgressByPhase.has(p.id));
    if (!phase) return null;
    return { phase, progress: inProgressByPhase.get(phase.id)! };
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

  // Daily Mission follow-up fix: useDsaProgress orders by created_at DESC
  // (newest-added first, which is what the DSA list page wants for a feed
  // view) — so picking .find() straight off that gave the most-recently
  // added unsolved problem, not the one queued longest ago. DSA problems
  // have no roadmap phase/order_index (they're a personal log, not
  // roadmap-sourced content), so "sequence" here means the order the
  // person themselves added them in — oldest-queued-first.
  const nextDsaProblem = useMemo(() => {
    const incomplete = (dsaProblems ?? []).filter((p) => !p.completed);
    if (incomplete.length === 0) return null;
    return [...incomplete].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
  },
    [dsaProblems]
  );

  // ---- 6 additions below, each grounded in data that already existed in
  // the schema and was already fetched/tracked elsewhere, just never
  // surfaced on Daily Mission itself. ----

  // 1. Yesterday's "tomorrow goal": daily_logs.tomorrow_goal is written in
  // Journal every session but was only ever displayed retrospectively in
  // Journal's own history list — never shown back on the day it's
  // actually relevant. Finds the most recent log strictly before today
  // that has a non-empty tomorrow_goal.
  const yesterdaysGoal = useMemo(() => {
    const today = todayISO();
    const past = (logs ?? [])
      .filter((l) => l.date < today && l.tomorrow_goal?.trim())
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return past[0]?.tomorrow_goal ?? null;
  }, [logs]);

  // 2. Streak-at-risk: streak.current is already computed/shown in a stat
  // card elsewhere on this page, but Daily Mission itself never connects
  // it to "log today or it breaks." hasLoggedToday checks the same
  // logs/hours>0 source computeStreak itself uses.
  const hasLoggedToday = useMemo(
    () => (logs ?? []).some((l) => l.date === todayISO() && l.hours > 0),
    [logs]
  );

  // 3. Next ClientSync milestone tied to the phase you're currently on.
  // Milestones link to a phase_id (linked_phase), and their "done" state
  // is derived from that phase's topics being complete (same rule the
  // ClientSync page itself uses) — there's no separate per-milestone
  // completed flag in the schema. "Next" = the milestone for nextTopic's
  // phase, since that's the phase currently being worked.
  const nextMilestone = useMemo(() => {
    if (!nextTopic || !milestones) return null;
    return milestones.find((m) => m.linked_phase === nextTopic.phase.id) ?? null;
  }, [milestones, nextTopic]);

  // 4. Next incomplete exercise, walking phases -> stages -> exercises in
  // roadmap order (mirrors nextTopic's own walk). stage_exercises has no
  // order_index in the schema, so within a stage, ties break by
  // created_at ascending — same reasoning as the nextDsaProblem fix
  // above: oldest-authored first is the closest available proxy for
  // "intended order" when no explicit one exists.
  //
  // Flattened via flatMap + find (with an explicit position index to
  // preserve phase/stage order as the primary sort, created_at only as
  // the tiebreaker within a stage) rather than nested for-loops — the
  // React Compiler could not preserve memoization across the loop form
  // (react-hooks/preserve-manual-memoization), same issue as
  // currentProject above.
  const nextExercise = useMemo(() => {
    const doneIds = new Set((exerciseProgress ?? []).filter((e) => e.completed).map((e) => e.exercise_id));
    const candidates = phases.flatMap((phase, phaseIdx) =>
      (phase.stages ?? []).flatMap((stage, stageIdx) =>
        stage.exercises
          .filter((e) => !doneIds.has(e.id))
          .map((exercise) => ({ exercise, phase, stage, phaseIdx, stageIdx }))
      )
    );
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => {
      if (a.phaseIdx !== b.phaseIdx) return a.phaseIdx - b.phaseIdx;
      if (a.stageIdx !== b.stageIdx) return a.stageIdx - b.stageIdx;
      return new Date(a.exercise.created_at).getTime() - new Date(b.exercise.created_at).getTime();
    })[0];
  }, [phases, exerciseProgress]);

  // 5. Upcoming interview: career_tracker.interview_date already exists
  // and applications is already fetched for the Engineering OS panel's
  // weekly count, but the date itself was never surfaced. Mirrors the
  // Interviews page's own upcoming-sort (daysUntil >= 0, soonest first).
  const upcomingInterview = useMemo(() => {
    const withDates = (applications ?? [])
      .filter((a) => a.interview_date && (daysUntil(a.interview_date) ?? -1) >= 0)
      .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime());
    return withDates[0] ?? null;
  }, [applications]);

  // 6. Build-in-Public reminder: build_in_public_status tracks a
  // posted:boolean per phase. If the phase just before nextTopic's phase
  // (i.e. the most recently fully-completed phase) has a capstone but
  // hasn't been posted about, that's a real, trackable gap — surfaced
  // once, not for every past unposted phase, to avoid Daily Mission
  // turning into a backlog of old phases. Phases can be flagged
  // skip_build_in_public (a real schema field, not every phase warrants a
  // public post) — those are excluded, same as posted ones.
  const unpostedCompletedPhase = useMemo(() => {
    const postedPhaseIds = new Set((buildInPublicStatus ?? []).filter((b) => b.posted).map((b) => b.phase_id));
    const completedWithCapstone = phases.filter(
      (p) =>
        p.capstone &&
        !p.skip_build_in_public &&
        p.topics.length > 0 &&
        p.topics.every((t) => t.progress?.completed)
    );
    // Most recently completed = last in roadmap order among completed phases.
    const lastCompleted = completedWithCapstone[completedWithCapstone.length - 1];
    if (!lastCompleted || postedPhaseIds.has(lastCompleted.id)) return null;
    return lastCompleted;
  }, [phases, buildInPublicStatus]);

  const missionOutcome = useMemo(() => {
    const parts: string[] = [];
    if (upcomingInterview) {
      const d = daysUntil(upcomingInterview.interview_date!);
      parts.push(`${d === 0 ? "interview today" : `interview in ${d}d`} (${upcomingInterview.company})`);
    }
    if (nextTopic) parts.push(`finish "${nextTopic.topic.title}"`);
    if (overdueRevisions.length > 0) {
      parts.push(`review ${overdueRevisions.length} overdue item${overdueRevisions.length === 1 ? "" : "s"}`);
    }
    if (nextDsaProblem) parts.push(`log 1 DSA problem (${nextDsaProblem.problem_name})`);
    if (currentProject) parts.push(`push ${currentProject.phase.title} forward`);
    if (!hasLoggedToday && streak.current > 0) {
      parts.push(`log today to keep your ${streak.current}-day streak`);
    }
    if (parts.length === 0) return "Nothing queued — you're caught up.";
    return parts.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".";
  }, [nextTopic, overdueRevisions, nextDsaProblem, currentProject, upcomingInterview, hasLoggedToday, streak]);

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

  async function handleCompleteExercise() {
    if (!user || !nextExercise) return;
    setCompletingExercise(true);
    try {
      await toggleExerciseComplete(user.id, nextExercise.exercise.id, true);
      await mutateExerciseProgress();
      toast.success("Exercise marked complete");
    } catch {
      toast.error("Couldn't update. Try again.");
    } finally {
      setCompletingExercise(false);
    }
  }

  // Applies today's hour-budget plan: fully-fitting topics get marked
  // complete; the one topic that overflows the budget (if any) gets its
  // actual_minutes_spent updated to reflect partial progress, so
  // tomorrow's plan correctly computes its remaining hours instead of
  // treating it as untouched. Doesn't touch daily_logs/streak — that's a
  // separate, explicit "Log today's session" action below, since the
  // hours here are a plan, not a confirmed record of hours actually
  // worked yet.
  async function handleApplyTodaysPlan() {
    if (!user || !todaysPlan || todaysPlan.entries.length === 0) return;
    setApplyingPlan(true);
    try {
      for (const entry of todaysPlan.entries) {
        if (entry.fullyFits) {
          await toggleTopicComplete(user.id, entry.topic.id, true);
        } else {
          const alreadyLoggedMinutes = entry.topic.progress?.actual_minutes_spent ?? 0;
          await updateTopicProgress(user.id, entry.topic.id, {
            actual_minutes_spent: alreadyLoggedMinutes + Math.round(entry.hoursToday * 60),
          });
        }
      }
      await mutateProgress();
      toast.success("Today's plan applied — partial progress saved, finished topics marked complete.");
    } catch {
      toast.error("Couldn't apply the plan. Try again.");
    } finally {
      setApplyingPlan(false);
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
            <CardTitle>Daily Mission</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Highest-urgency banners: an upcoming interview and a streak
              about to break are the two things most likely to actually
              cost you something if missed, so they lead the card, above
              even the next-topic block. */}
          {upcomingInterview && (
            <Link
              href="/interviews"
              className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning hover:bg-warning/10 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium">
                  {daysUntil(upcomingInterview.interview_date!) === 0
                    ? "Interview today"
                    : `Interview in ${daysUntil(upcomingInterview.interview_date!)} day${
                        daysUntil(upcomingInterview.interview_date!) === 1 ? "" : "s"
                      }`}
                </span>
                {" — "}
                {upcomingInterview.company}
                {upcomingInterview.role ? ` (${upcomingInterview.role})` : ""}
              </span>
            </Link>
          )}

          {!hasLoggedToday && streak.current > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
              <Flame className="h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium">{streak.current}-day streak</span> — log something today to keep it
                going.
              </span>
            </div>
          )}

          {yesterdaysGoal && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2 text-xs">
              <Quote className="h-3.5 w-3.5 text-muted shrink-0 mt-0.5" />
              <span className="text-muted">
                <span className="text-foreground font-medium">Yesterday you said: </span>
                {yesterdaysGoal}
              </span>
            </div>
          )}

          {nextTopic ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{nextTopic.phase.phase_number}</Badge>
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

          {/* Hours-budget planner: set today's available hours, get back
              which topics (in roadmap order) fit in that budget, with the
              one that overflows split into "today" / "tomorrow" portions. */}
          {nextTopic && (
            <div className="pt-3 border-t border-border flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted shrink-0" />
                <label htmlFor="hours-budget" className="text-xs text-muted shrink-0">
                  Hours available today
                </label>
                <Input
                  id="hours-budget"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 8"
                  value={hoursBudget}
                  onChange={(e) => setHoursBudget(e.target.value)}
                  className="h-8 max-w-[100px] text-sm"
                />
              </div>

              {todaysPlan && todaysPlan.entries.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted">
                    Plan for {formatHours(todaysPlan.budget)}, in roadmap order:
                  </p>
                  <ul className="flex flex-col gap-2">
                    {todaysPlan.entries.map((entry) => (
                      <li
                        key={entry.topic.id}
                        className="flex items-center justify-between gap-3 text-sm rounded-md border border-border bg-surface-2/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="outline" className="text-[10px]">
                              {entry.phase.phase_number}
                            </Badge>
                            <span className="truncate">{entry.topic.title}</span>
                          </div>
                          {entry.fullyFits ? (
                            <p className="text-xs text-muted">
                              {formatHours(entry.hoursToday)} — finishes it today
                            </p>
                          ) : (
                            <p className="text-xs text-warning flex items-center gap-1">
                              {formatHours(entry.hoursToday)} today of {formatHours(entry.remainingHoursBefore)}{" "}
                              remaining
                              <ArrowRight className="h-3 w-3" />
                              {formatHours(entry.remainingHoursBefore - entry.hoursToday)} carries to tomorrow
                            </p>
                          )}
                        </div>
                        {entry.fullyFits ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-warning shrink-0" />
                        )}
                      </li>
                    ))}
                  </ul>

                  {todaysPlan.skippedNoEstimate.length > 0 && (
                    <p className="text-xs text-muted/70">
                      {todaysPlan.skippedNoEstimate.length} topic
                      {todaysPlan.skippedNoEstimate.length === 1 ? "" : "s"} after this have no time estimate in
                      the roadmap, so they&apos;re not counted in the budget — do them after, or check manually.
                    </p>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApplyTodaysPlan}
                    disabled={applyingPlan}
                    className="self-start"
                  >
                    {applyingPlan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Apply this plan
                  </Button>
                </div>
              )}

              {hoursBudget && parseFloat(hoursBudget) > 0 && (!todaysPlan || todaysPlan.entries.length === 0) && (
                <p className="text-xs text-muted">
                  No topics with a time estimate fit in {formatHours(parseFloat(hoursBudget))} right now.
                </p>
              )}
            </div>
          )}

          {(overdueRevisions.length > 0 ||
            currentProject ||
            nextDsaProblem ||
            nextMilestone ||
            nextExercise ||
            unpostedCompletedPhase) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 border-t border-border">
              <Link
                href="/revision"
                className="flex items-center gap-2 text-xs pt-3 hover:text-accent transition-colors"
              >
                <AlertCircle className="h-3.5 w-3.5 text-muted shrink-0" />
                <span className={overdueRevisions.length > 0 ? "text-warning" : "text-muted"}>
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
              <Link
                href="/clientsync"
                className="flex items-center gap-2 text-xs pt-3 hover:text-accent transition-colors"
              >
                <Briefcase className="h-3.5 w-3.5 text-muted shrink-0" />
                <span className="text-muted truncate">
                  {nextMilestone ? nextMilestone.description : "No ClientSync milestone for this phase"}
                </span>
              </Link>
              <div className="flex items-center justify-between gap-2 text-xs pt-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Dumbbell className="h-3.5 w-3.5 text-muted shrink-0" />
                  <span className="text-muted truncate">
                    {nextExercise ? nextExercise.exercise.description : "No exercises queued"}
                  </span>
                </div>
                {nextExercise && (
                  <button
                    onClick={handleCompleteExercise}
                    disabled={completingExercise}
                    className="text-accent hover:underline shrink-0 disabled:opacity-50"
                  >
                    {completingExercise ? "..." : "Done"}
                  </button>
                )}
              </div>
              {unpostedCompletedPhase && (
                <Link
                  href="/roadmap"
                  className="flex items-center gap-2 text-xs pt-3 hover:text-accent transition-colors"
                >
                  <Megaphone className="h-3.5 w-3.5 text-warning shrink-0" />
                  <span className="text-warning truncate">
                    Post about {unpostedCompletedPhase.title} — Build-in-Public
                  </span>
                </Link>
              )}
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