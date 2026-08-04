"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useClientSyncMilestones, useRoadmapMetadata } from "@/lib/hooks/use-roadmap";
import { useDailyLogs, computeStreak, weeklyHours, weeklyBreakdown } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useProjectProgress, useBuildInPublicStatus } from "@/lib/hooks/use-projects";
import { useExerciseProgress } from "@/lib/hooks/use-exercises";
import { useRoadmap } from "@/lib/hooks/use-roadmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHours, pct } from "@/lib/utils";
import { Map as MapIcon, Code2, RotateCcw, Layers, FolderGit2, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle, Dumbbell, Megaphone, Rocket } from "lucide-react";
import type { ClientSyncMilestone } from "@/types/database";

export default function StatisticsPage() {
  const { user } = useUser();
  const { phases, isLoading } = usePhasesWithProgress(user?.id);
  const { data: logs } = useDailyLogs(user?.id);
  const { data: dsa } = useDsaProgress(user?.id);
  const { data: projects } = useProjectProgress(user?.id);
  const { data: milestonesRaw } = useClientSyncMilestones();
  const milestones = (milestonesRaw ?? []) as ClientSyncMilestone[];
  const { data: exerciseProgress } = useExerciseProgress(user?.id);
  const { data: bipStatus } = useBuildInPublicStatus(user?.id);
  const { data: roadmap } = useRoadmap();
  const { data: metadata } = useRoadmapMetadata();

  const allTopics = useMemo(() => phases.flatMap((p) => p.topics), [phases]);
  const completedTopics = useMemo(() => allTopics.filter((t) => t.progress?.completed), [allTopics]);
  const totalHours = allTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
  const completedHours = completedTopics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);

  const completedPhases = phases.filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed));

  const streak = computeStreak(logs ?? []);
  const week = weeklyHours(logs ?? []);

  const totalLoggedHours = (logs ?? []).reduce((s, l) => s + Number(l.hours), 0);
  const daysLogged = (logs ?? []).filter((l) => l.hours > 0).length;
  const avgDaily = daysLogged > 0 ? totalLoggedHours / daysLogged : 0;

  const firstLogDate = (logs ?? []).length
    ? [...(logs ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1))[0].date
    : null;
  const weeksSinceStart = firstLogDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(firstLogDate).getTime()) / (7 * 86400000)))
    : 1;
  const avgWeekly = totalLoggedHours / weeksSinceStart;

  const dsaCompleted = (dsa ?? []).filter((d) => d.completed).length;
  const projectsCompleted = (projects ?? []).filter((p) => p.status === "completed").length;

  // ---------- Multi-axis breakdown (P7.2 — one unified view across every tracker) ----------

  const dsaByDifficulty = useMemo(() => {
    const buckets: Record<"easy" | "medium" | "hard", { done: number; total: number }> = {
      easy: { done: 0, total: 0 },
      medium: { done: 0, total: 0 },
      hard: { done: 0, total: 0 },
    };
    for (const p of dsa ?? []) {
      buckets[p.difficulty].total += 1;
      if (p.completed) buckets[p.difficulty].done += 1;
    }
    return buckets;
  }, [dsa]);

  const revisionBreakdown = useMemo(() => {
    const buckets = { needs_revision: 0, comfortable: 0, mastered: 0, unset: 0 };
    for (const t of completedTopics) {
      const status = t.progress?.revision_status;
      if (status === "needs_revision") buckets.needs_revision += 1;
      else if (status === "comfortable") buckets.comfortable += 1;
      else if (status === "mastered") buckets.mastered += 1;
      else buckets.unset += 1;
    }
    return buckets;
  }, [completedTopics]);

  // ---------- Personal analytics (P7.5 item 20) ----------

  // "Hardest topics" combines two real signals rather than inventing a
  // single one: the person's own difficulty rating ("hard"), and how far
  // actual time spent overran the roadmap's own estimate — a topic that
  // took 3x its estimate is empirically hard whether or not it got rated
  // that way. Sorted by overrun ratio so the worst mismatches surface
  // first; unrated, on-estimate topics don't appear here at all.
  const hardestTopics = useMemo(() => {
    return completedTopics
      .map((t) => {
        const estimatedMinutes = (t.estimated_hours ?? 0) * 60;
        const actualMinutes = t.progress?.actual_minutes_spent ?? 0;
        const overrunRatio = estimatedMinutes > 0 && actualMinutes > 0 ? actualMinutes / estimatedMinutes : null;
        const ratedHard = t.progress?.difficulty === "hard";
        return { topic: t, overrunRatio, ratedHard };
      })
      .filter((x) => x.ratedHard || (x.overrunRatio !== null && x.overrunRatio >= 1.5))
      .sort((a, b) => {
        // Rated-hard-and-overran first, then by overrun ratio, then rated-hard-only last
        const aScore = (a.overrunRatio ?? 1) + (a.ratedHard ? 1 : 0);
        const bScore = (b.overrunRatio ?? 1) + (b.ratedHard ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 8);
  }, [completedTopics]);

  // Velocity: week-over-week logged hours, oldest to newest. "Trending up"
  // compares the most recent complete week to the one before it — not a
  // long-run average, since a single big week shouldn't be read as a
  // permanent trend either direction.
  const weeks = useMemo(() => weeklyBreakdown(logs ?? []), [logs]);
  const bestWeek = useMemo(
    () => (weeks.length > 0 ? weeks.reduce((max, w) => (w.hours > max.hours ? w : max), weeks[0]) : null),
    [weeks]
  );
  const velocityTrend = useMemo(() => {
    if (weeks.length < 2) return null;
    const last = weeks[weeks.length - 1];
    const prev = weeks[weeks.length - 2];
    if (prev.hours === 0) return null;
    const change = ((last.hours - prev.hours) / prev.hours) * 100;
    return { change, lastWeekHours: last.hours, prevWeekHours: prev.hours };
  }, [weeks]);

  const isMilestoneComplete = (phaseId: string | null) => {
    const phase = phases.find((p) => p.id === phaseId);
    return !!phase && phase.topics.length > 0 && phase.topics.every((t) => t.progress?.completed);
  };
  const milestonesComplete = milestones.filter((m) => isMilestoneComplete(m.linked_phase)).length;

  const projectStatusCounts = useMemo(() => {
    const counts = { not_started: 0, in_progress: 0, completed: 0 };
    const portfolioPhases = phases.filter((p) => (p.estimated_hours ?? 0) > 0);
    const byPhase = new Map((projects ?? []).map((p) => [p.phase_id, p]));
    for (const phase of portfolioPhases) {
      const status = byPhase.get(phase.id)?.status ?? "not_started";
      counts[status] += 1;
    }
    return { counts, total: portfolioPhases.length };
  }, [phases, projects]);

  // Exercises axis — total comes from static stage_exercises, completion from
  // the per-user exercise_progress table (Item 17).
  const totalExercises = (roadmap?.stageExercises ?? []).length;
  const exercisesCompleted = (exerciseProgress ?? []).filter((e) => e.completed).length;

  // Portfolio axis — deployed/linked artifacts, distinct from the Projects
  // axis's status field: a project can be "completed" with no link filled in,
  // or "in_progress" with a live deployment already up.
  const portfolioEligible = phases.filter((p) => p.capstone || (p.estimated_hours ?? 0) > 0).length;
  const portfolioLinked = (projects ?? []).filter((p) => p.github_url || p.deployment_url).length;

  // Build-in-Public axis — phases with skip_build_in_public=true don't count
  // toward the denominator, since the roadmap itself says no post is expected there.
  const bipEligiblePhases = phases.filter((p) => !p.skip_build_in_public);
  const bipPosted = (bipStatus ?? []).filter((b) => b.posted).length;

  const axes = [
    {
      key: "roadmap",
      label: "Roadmap",
      icon: MapIcon,
      href: "/roadmap",
      pct: pct(completedTopics.length, allTopics.length),
      summary: `${completedTopics.length}/${allTopics.length} topics`,
      detail: `${completedPhases.length}/${phases.length} phases complete`,
    },
    {
      key: "dsa",
      label: "DSA Tracker",
      icon: Code2,
      href: "/dsa",
      pct: pct(dsaCompleted, (dsa ?? []).length),
      summary: `${dsaCompleted}/${(dsa ?? []).length} problems`,
      detail: `E ${dsaByDifficulty.easy.done}/${dsaByDifficulty.easy.total} · M ${dsaByDifficulty.medium.done}/${dsaByDifficulty.medium.total} · H ${dsaByDifficulty.hard.done}/${dsaByDifficulty.hard.total}`,
    },
    {
      key: "revision",
      label: "Revision",
      icon: RotateCcw,
      href: "/revision",
      pct: pct(revisionBreakdown.mastered, completedTopics.length),
      summary: `${revisionBreakdown.mastered}/${completedTopics.length} mastered`,
      detail: `${revisionBreakdown.needs_revision} need revision · ${revisionBreakdown.comfortable} comfortable`,
    },
    {
      key: "clientsync",
      label: "ClientSync",
      icon: Layers,
      href: "/clientsync",
      pct: pct(milestonesComplete, milestones.length),
      summary: `${milestonesComplete}/${milestones.length} milestones`,
      detail: "B2B onboarding SaaS anchor project",
    },
    {
      key: "projects",
      label: "Projects",
      icon: FolderGit2,
      href: "/projects",
      pct: pct(projectsCompleted, projectStatusCounts.total),
      summary: `${projectsCompleted}/${projectStatusCounts.total} capstones`,
      detail: `${projectStatusCounts.counts.in_progress} in progress · ${projectStatusCounts.counts.not_started} not started`,
    },
    {
      key: "exercises",
      label: "Exercises",
      icon: Dumbbell,
      href: "/roadmap",
      pct: pct(exercisesCompleted, totalExercises),
      summary: `${exercisesCompleted}/${totalExercises} exercises`,
      detail: "Per-stage practice exercises",
    },
    {
      key: "portfolio",
      label: "Portfolio",
      icon: Rocket,
      href: "/portfolio",
      pct: pct(portfolioLinked, portfolioEligible),
      summary: `${portfolioLinked}/${portfolioEligible} shipped`,
      detail: "Phases with a repo or live deployment linked",
    },
    {
      key: "build-in-public",
      label: "Build in Public",
      icon: Megaphone,
      href: "/roadmap",
      pct: pct(bipPosted, bipEligiblePhases.length),
      summary: `${bipPosted}/${bipEligiblePhases.length} posted`,
      detail: "Phases with a public post/commit/README artifact",
    },
  ];

  const stats = [
    { label: "Topics completed", value: `${completedTopics.length} / ${allTopics.length}` },
    { label: "Topics remaining", value: allTopics.length - completedTopics.length },
    { label: "Completed hours", value: formatHours(completedHours) },
    { label: "Remaining hours", value: formatHours(totalHours - completedHours) },
    { label: "Average daily hours", value: `${avgDaily.toFixed(1)}h` },
    { label: "Average weekly hours", value: `${avgWeekly.toFixed(1)}h` },
    { label: "Current streak", value: `${streak.current} days` },
    { label: "Best streak", value: `${streak.best} days` },
    { label: "Completed phases", value: `${completedPhases.length} / ${phases.length}` },
    { label: "Remaining phases", value: phases.length - completedPhases.length },
    { label: "Projects completed", value: projectsCompleted },
    { label: "DSA problems solved", value: dsaCompleted },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Statistics</h1>
        <p className="text-sm text-muted">The full picture, at a glance.</p>
      </div>

      {/* Item 26 — headline raw counts, straight from roadmap_metadata / static
          content, not percentages. The scale of the whole program at a glance. */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "Topics", value: metadata?.total_topics ?? allTopics.length },
          { label: "Phases", value: metadata?.total_phases ?? phases.length },
          { label: "Stages", value: metadata?.total_stages ?? "—" },
          { label: "Projects", value: metadata?.total_stage_projects ?? "—" },
          { label: "Exercises", value: metadata?.total_stage_exercises ?? totalExercises },
          { label: "Hours", value: metadata?.total_realistic_hours ?? Math.round(totalHours) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-3 text-center">
            <p className="text-lg font-bold font-mono-tabular text-accent">{s.value}</p>
            <p className="text-[11px] text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress by axis</CardTitle>
          <p className="text-xs text-muted mt-1">
            Every tracker&apos;s own completion, side by side — not blended into a single score.
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {axes.map((axis) => (
            <Link key={axis.key} href={axis.href} className="block">
              <div className="rounded-lg border border-border p-3 h-full flex flex-col gap-2 transition-colors hover:border-accent/40">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <axis.icon className="h-3.5 w-3.5" />
                  {axis.label}
                </div>
                <p className="text-xl font-bold font-mono-tabular">{axis.pct}%</p>
                <Progress value={axis.pct} className="h-1.5" />
                <p className="text-xs font-medium">{axis.summary}</p>
                <p className="text-[11px] text-muted leading-snug">{axis.detail}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted mb-1">{s.label}</p>
              <p className="text-2xl font-bold font-mono-tabular">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall completion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Topics</span>
              <span>{pct(completedTopics.length, allTopics.length)}%</span>
            </div>
            <Progress value={pct(completedTopics.length, allTopics.length)} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Hours</span>
              <span>{pct(completedHours, totalHours)}%</span>
            </div>
            <Progress value={pct(completedHours, totalHours)} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Phases</span>
              <span>{pct(completedPhases.length, phases.length)}%</span>
            </div>
            <Progress value={pct(completedPhases.length, phases.length)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projected completion</CardTitle>
        </CardHeader>
        <CardContent>
          {avgWeekly > 0 ? (
            <p className="text-sm text-foreground/90">
              At your current pace of <span className="font-mono-tabular text-accent">{avgWeekly.toFixed(1)}h/week</span>,
              the remaining <span className="font-mono-tabular">{formatHours(totalHours - completedHours)}</span> will
              take approximately{" "}
              <span className="font-semibold text-accent">
                {Math.ceil((totalHours - completedHours) / avgWeekly)} weeks
              </span>
              .
            </p>
          ) : (
            <p className="text-sm text-muted">Log a few study sessions to see a projected completion date.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Velocity & best week</CardTitle>
          <p className="text-xs text-muted mt-1">Derived from your logged study sessions, week over week.</p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted mb-1">This week vs. last week</p>
            {velocityTrend ? (
              <div className="flex items-center gap-2">
                {velocityTrend.change > 5 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : velocityTrend.change < -5 ? (
                  <TrendingDown className="h-4 w-4 text-danger" />
                ) : (
                  <Minus className="h-4 w-4 text-muted" />
                )}
                <span
                  className={`text-lg font-bold font-mono-tabular ${
                    velocityTrend.change > 5 ? "text-success" : velocityTrend.change < -5 ? "text-danger" : ""
                  }`}
                >
                  {velocityTrend.change > 0 ? "+" : ""}
                  {velocityTrend.change.toFixed(0)}%
                </span>
                <span className="text-xs text-muted">
                  ({velocityTrend.lastWeekHours.toFixed(1)}h vs {velocityTrend.prevWeekHours.toFixed(1)}h)
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted">Not enough logged weeks yet to compare.</p>
            )}
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted mb-1 flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Best week
            </p>
            {bestWeek ? (
              <p className="text-lg font-bold font-mono-tabular text-accent">
                {bestWeek.hours.toFixed(1)}h
                <span className="text-xs text-muted font-normal ml-2">
                  week of{" "}
                  {new Date(bestWeek.weekStart + "T00:00:00").toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted">No logged weeks yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {hardestTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Hardest topics
            </CardTitle>
            <p className="text-xs text-muted mt-1">
              Rated &ldquo;hard&rdquo;, or took meaningfully longer than the roadmap&apos;s own estimate —
              worth a revisit.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {hardestTopics.map(({ topic, overrunRatio, ratedHard }) => (
              <div key={topic.id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-2 flex-wrap">
                <span className="text-sm flex-1 min-w-[160px]">{topic.title}</span>
                {ratedHard && <Badge variant="danger">Hard</Badge>}
                {overrunRatio !== null && (
                  <Badge variant="outline" className="font-mono-tabular text-xs font-normal">
                    {overrunRatio.toFixed(1)}× estimate
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hours calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted mb-4">
            Remaining hours ({formatHours(totalHours - completedHours)}) at fixed weekly commitments —
            for planning, independent of your logged pace above.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[20, 40, 60].map((hrsPerWeek) => {
              const remaining = totalHours - completedHours;
              const weeks = remaining > 0 ? Math.ceil(remaining / hrsPerWeek) : 0;
              const months = (weeks / 4.345).toFixed(1);
              return (
                <div key={hrsPerWeek} className="rounded-md border border-border p-3 text-center">
                  <p className="text-xs text-muted mb-1">{hrsPerWeek}h/week</p>
                  <p className="text-xl font-bold font-mono-tabular text-accent">{weeks}</p>
                  <p className="text-[11px] text-muted">weeks (~{months} mo)</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
