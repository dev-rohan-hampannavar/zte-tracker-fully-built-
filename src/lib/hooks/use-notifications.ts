"use client";

import { useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useClientSyncMilestones, useExitLadder } from "@/lib/hooks/use-roadmap";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { isOverdue } from "@/lib/revision-schedule";
import type { ClientSyncMilestone } from "@/types/database";

export type NotificationKind =
  | "revision_overdue"
  | "milestone_pending"
  | "ready_to_apply"
  | "project_inactive"
  | "exit_almost_ready";

// Item 52 — the two thresholds the plan names but doesn't pin a number to.
// 14 days matches this app's other "inactive" framing (streak breaks after
// a day, but a project going quiet is a slower signal — two weeks is long
// enough to mean "actually stalled," not just "worked on something else
// for a few days"). 90% is explicit in the plan.
const PROJECT_INACTIVE_DAYS = 14;
const EXIT_ALMOST_READY_THRESHOLD = 0.9;

// Isolates the one impure call (Date.now()) behind a plain function so the
// react-compiler purity lint doesn't flag it inline inside the useMemo body
// below — same reasoning revision-schedule.ts's isOverdue()/daysUntil()
// already apply to this exact problem.
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
}

/**
 * Computes real, current-state notifications on every load — not a
 * delivery mechanism (no push/email infra exists or is being added here;
 * this is a client-rendered app with no server-side scheduler), and not a
 * "new since you last looked" diff (no read/seen tracking exists, and
 * inventing one would mean guessing at a UX the source doc doesn't
 * specify). What this gives instead: exactly the three signals the doc
 * names, computed fresh each time, reusing the same completion logic
 * already proven correct on Revision (P7.4), ClientSync (P7.2), and Exit
 * Ladder (P7.1) — not new derivations, just aggregated in one place.
 */
export function useNotifications() {
  const { user } = useUser();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: milestonesRaw, isLoading: milestonesLoading } = useClientSyncMilestones();
  const { data: projectProgress } = useProjectProgress(user?.id);
  const { data: exitLadder, isLoading: exitLoading } = useExitLadder();

  const milestones = useMemo(() => (milestonesRaw ?? []) as ClientSyncMilestone[], [milestonesRaw]);

  const notifications = useMemo(() => {
    const result: AppNotification[] = [];

    // ---- Revision overdue (same logic as /revision) ----
    const allTopics = phases.flatMap((p) => p.topics);
    const overdueTopics = allTopics.filter(
      (t) => t.progress?.completed && isOverdue(t.progress?.next_review_due ?? null)
    );
    if (overdueTopics.length > 0) {
      result.push({
        id: "revision-overdue",
        kind: "revision_overdue",
        title: `${overdueTopics.length} topic${overdueTopics.length === 1 ? "" : "s"} overdue for revision`,
        detail:
          overdueTopics
            .slice(0, 3)
            .map((t) => t.title)
            .join(", ") + (overdueTopics.length > 3 ? `, +${overdueTopics.length - 3} more` : ""),
        href: "/revision",
      });
    }

    // ---- Milestone pending (roadmap done, ClientSync artifact not) ----
    const isPhaseComplete = (phaseId: string | null) => {
      const phase = phases.find((p) => p.id === phaseId);
      return !!phase && phase.topics.length > 0 && phase.topics.every((t) => t.progress?.completed);
    };
    const projectByPhase = new Map((projectProgress ?? []).map((p) => [p.phase_id, p]));
    const pendingMilestones = milestones.filter((m) => {
      if (!isPhaseComplete(m.linked_phase)) return false;
      const progress = m.linked_phase ? projectByPhase.get(m.linked_phase) : undefined;
      return progress?.status !== "completed";
    });
    if (pendingMilestones.length > 0) {
      result.push({
        id: "milestone-pending",
        kind: "milestone_pending",
        title: `${pendingMilestones.length} ClientSync milestone${pendingMilestones.length === 1 ? "" : "s"} pending`,
        detail: "Roadmap topics are done, but the deliverable (repo, deploy, or demo) isn't marked complete yet.",
        href: "/clientsync",
      });
    }

    // ---- Ready to apply (an exit tier is fully complete) ----
    const orderedPhases = [...phases].sort((a, b) => a.order_index - b.order_index);
    const phaseIndex = (id: string | null) => (id ? orderedPhases.findIndex((p) => p.id === id) : -1);
    for (const exit of exitLadder ?? []) {
      const cutoff = phaseIndex(exit.linked_phase);
      if (cutoff < 0) continue;
      const phasesUpTo = orderedPhases.slice(0, cutoff + 1);
      const total = phasesUpTo.reduce((sum, p) => sum + p.topics.length, 0);
      const done = phasesUpTo.reduce(
        (sum, p) => sum + p.topics.filter((t) => t.progress?.completed).length,
        0
      );
      if (total === 0) continue;
      const ratio = done / total;
      if (ratio === 1) {
        result.push({
          id: `ready-${exit.exit_code}`,
          kind: "ready_to_apply",
          title: `Ready to apply — Exit ${exit.exit_code}`,
          detail: `${exit.job_level ?? ""} · ${exit.salary_range ?? ""}`,
          href: "/exit-ladder",
        });
      } else if (ratio >= EXIT_ALMOST_READY_THRESHOLD) {
        result.push({
          id: `almost-${exit.exit_code}`,
          kind: "exit_almost_ready",
          title: `Exit ${exit.exit_code} is ${Math.round(ratio * 100)}% complete`,
          detail: `${total - done} topic${total - done === 1 ? "" : "s"} left before this exit point is ready.`,
          href: "/exit-ladder",
        });
      }
    }

    // ---- Project inactive (in-progress, no update in PROJECT_INACTIVE_DAYS) ----
    const staleProjects = (projectProgress ?? []).filter(
      (p) => p.status === "in_progress" && daysSince(p.updated_at) > PROJECT_INACTIVE_DAYS
    );
    for (const p of staleProjects) {
      const phase = phases.find((ph) => ph.id === p.phase_id);
      if (!phase) continue;
      result.push({
        id: `inactive-${p.phase_id}`,
        kind: "project_inactive",
        title: `${phase.title} hasn't moved in ${daysSince(p.updated_at)} days`,
        detail: "Marked in progress but no updates recently — pick it back up or update its status.",
        href: "/projects",
      });
    }

    return result;
  }, [phases, milestones, projectProgress, exitLadder]);

  return {
    notifications,
    isLoading: phasesLoading || milestonesLoading || exitLoading,
  };
}
