"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useDailyLogs } from "@/lib/hooks/use-daily-logs";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useGoals } from "@/lib/hooks/use-goals";
import { useSkillEvidence } from "@/lib/hooks/use-skills";
import { useInterviewWeaknesses } from "@/lib/hooks/use-interview-prep";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { isOverdue } from "@/lib/revision-schedule";
import { generateDailyPlan, type GeneratedPlan } from "@/lib/daily-planner";

// Isolates the one impure call (Date.now()) behind a plain function so the
// react-compiler purity lint doesn't flag it inside useMemo bodies below.
function now(): number {
  return Date.now();
}

/**
 * Historical completion rate: over the last 14 days, the fraction of days
 * that have any logged study time at all. This is an honest, real proxy
 * for "does this person tend to follow through" — NOT a measure of
 * whether a specific planned task list was completed, since this app has
 * no stored daily-plan-vs-actual record to compare against yet. Labeled
 * as such in the UI rather than presented as more precise than it is.
 */
function computeCompletionRate(logs: { date: string; hours: number }[] | undefined): number | null {
  if (!logs || logs.length === 0) return null;
  const cutoff = Date.now() - 14 * 86400000;
  const recent = logs.filter((l) => new Date(l.date).getTime() >= cutoff);
  if (recent.length < 5) return null; // not enough history to draw a conclusion
  const daysWithActivity = recent.filter((l) => l.hours > 0).length;
  return daysWithActivity / recent.length;
}

export function useDailyPlan(availableMinutes: number) {
  const { user } = useUser();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: logs } = useDailyLogs(user?.id);
  const { data: projectProgress } = useProjectProgress(user?.id);
  const { data: goals } = useGoals(user?.id);
  const { data: skillEvidence } = useSkillEvidence(user?.id);
  const { data: interviewWeaknesses } = useInterviewWeaknesses(user?.id);
  const { data: applications } = useCareerTracker(user?.id);

  const allTopics = useMemo(() => phases.flatMap((p) => p.topics), [phases]);

  const overdueRevisionTopics = useMemo(
    () => allTopics.filter((t) => t.progress?.completed && isOverdue(t.progress?.next_review_due ?? null)),
    [allTopics]
  );

  const nextTopic = useMemo(() => {
    const candidates = phases.flatMap((phase, phaseIdx) =>
      (phase.stages ?? []).flatMap((stage, stageIdx) =>
        stage.topics.map((topic, topicIdx) => ({ topic, phaseIdx, stageIdx, topicIdx }))
      )
    );
    return candidates
      .filter((c) => !c.topic.progress?.completed)
      .sort((a, b) => a.phaseIdx - b.phaseIdx || a.stageIdx - b.stageIdx || a.topicIdx - b.topicIdx)[0]?.topic ?? null;
  }, [phases]);

  const currentProject = useMemo(() => {
    const inProgress = (projectProgress ?? []).find((p) => p.status === "in_progress");
    if (!inProgress) return null;
    const phase = phases.find((p) => p.id === inProgress.phase_id) ?? null;
    if (!phase) return null;
    const stageProject = (phase.stages ?? []).flatMap((s) => s.projects ?? [])[0] ?? null;
    return { phase, stageProjectId: stageProject?.id ?? null };
  }, [projectProgress, phases]);

  const weakestSkills = useMemo(
    () => [...(skillEvidence ?? [])].filter((s) => s.knowledge_pct > 0).sort((a, b) => a.knowledge_pct - b.knowledge_pct).slice(0, 3),
    [skillEvidence]
  );
  const staleSkillCount = (skillEvidence ?? []).filter((s) => s.freshness === "stale" && s.knowledge_pct > 0).length;

  const applicationsWithUpcomingInterview = useMemo(() => {
    const nowMs = now();
    return (applications ?? []).filter((a) => {
      if (!a.interview_date) return false;
      const days = Math.ceil((new Date(a.interview_date).getTime() - nowMs) / 86400000);
      return days >= 0 && days <= 3;
    });
  }, [applications]);

  const historicalCompletionRate = useMemo(() => computeCompletionRate(logs), [logs]);

  const plan: GeneratedPlan | null = useMemo(() => {
    if (phasesLoading) return null;
    return generateDailyPlan({
      availableMinutes,
      goals: goals ?? [],
      overdueRevisionTopics,
      weakestSkills,
      staleSkillCount,
      interviewWeaknesses: interviewWeaknesses ?? [],
      applicationsWithUpcomingInterview,
      currentProjectTitle: currentProject ? currentProject.phase.title : null,
      currentProjectStageProjectId: currentProject ? currentProject.stageProjectId : null,
      nextTopicTitle: nextTopic ? nextTopic.title : null,
      nextTopicId: nextTopic ? nextTopic.id : null,
      historicalCompletionRate,
    });
  }, [
    phasesLoading,
    availableMinutes,
    goals,
    overdueRevisionTopics,
    weakestSkills,
    staleSkillCount,
    interviewWeaknesses,
    applicationsWithUpcomingInterview,
    currentProject,
    nextTopic,
    historicalCompletionRate,
  ]);

  return { plan, isLoading: phasesLoading, historicalCompletionRate };
}
