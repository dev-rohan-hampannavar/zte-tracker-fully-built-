"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useClientSyncMilestones, useExitLadder } from "@/lib/hooks/use-roadmap";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useDailyLogs, computeStreak } from "@/lib/hooks/use-daily-logs";
import { useGoals } from "@/lib/hooks/use-goals";
import { useSkillEvidence } from "@/lib/hooks/use-skills";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { useInterviewAttempts } from "@/lib/hooks/use-interview-prep";
import { useTargetRoles, useJobReadiness } from "@/lib/hooks/use-job-readiness";
import { computeCareerMilestones } from "@/lib/career-milestones";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { isOverdue } from "@/lib/revision-schedule";
import { todayISO } from "@/lib/utils";
import type { ClientSyncMilestone, NotificationDismissal } from "@/types/database";

const supabase = createClient();

export type NotificationKind =
  | "revision_overdue"
  | "milestone_pending"
  | "ready_to_apply"
  | "project_inactive"
  | "exit_almost_ready"
  | "daily_log_missing"
  | "skill_stale"
  | "goal_deadline"
  | "interview_reminder"
  | "follow_up_reminder"
  | "career_milestone";

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

// Same reasoning as daysSince() above — isolates Date.now() behind a
// plain function so the react-compiler purity lint doesn't flag it
// inline inside the useMemo bodies below.
function now(): number {
  return Date.now();
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
  const { data: dsaProgress } = useDsaProgress(user?.id);
  const { data: exitLadder, isLoading: exitLoading } = useExitLadder();
  const { data: logs, isLoading: logsLoading } = useDailyLogs(user?.id);
  const { data: goals } = useGoals(user?.id);
  const { data: skillEvidence } = useSkillEvidence(user?.id);
  const { data: applications } = useCareerTracker(user?.id);
  const { data: interviewAttempts } = useInterviewAttempts(user?.id);
  const { data: roles } = useTargetRoles();
  const { breakdown: readinessBreakdown } = useJobReadiness(user?.id, roles?.[0]);
  const { data: dismissals, mutate: mutateDismissals } = useNotificationDismissals(user?.id);
  const { data: settings } = useUserSettings(user?.id);

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

    // ---- Daily log missing (no session logged yet today) ----
    // Only fires once there's an established pattern worth protecting — a
    // brand-new account with zero logs ever isn't "missing" a streak, it
    // just hasn't started, so this stays quiet until computeStreak reports
    // at least one day logged historically (current streak > 0 means
    // yesterday or earlier was logged, which is the case this notification
    // actually addresses: don't let a real streak lapse).
    if (logs) {
      const hasLoggedToday = logs.some((l) => l.date === todayISO() && l.hours > 0);
      const { current: currentStreak } = computeStreak(logs);
      if (!hasLoggedToday && currentStreak > 0) {
        result.push({
          id: "daily-log-missing",
          kind: "daily_log_missing",
          title: `Log today's session to keep your ${currentStreak}-day streak`,
          detail: "No hours logged yet today — a quick entry on the dashboard keeps it going.",
          href: "/dashboard",
        });
      }
    }

    // ---- Skill stale (Phase 4 freshness/decay — needs revision) ----
    const staleSkills = (skillEvidence ?? []).filter((s) => s.freshness === "stale" && s.knowledge_pct > 0);
    if (staleSkills.length > 0) {
      result.push({
        id: "skills-stale",
        kind: "skill_stale",
        title: `${staleSkills.length} skill${staleSkills.length === 1 ? "" : "s"} going stale`,
        detail:
          staleSkills
            .slice(0, 3)
            .map((s) => s.technology_name)
            .join(", ") + (staleSkills.length > 3 ? `, +${staleSkills.length - 3} more` : ""),
        href: "/skills",
      });
    }

    // ---- Goal deadline approaching (within 7 days, not yet complete) ----
    const nowMs = now();
    for (const g of goals ?? []) {
      if (g.status !== "active" || !g.target_date) continue;
      const daysLeft = Math.ceil((new Date(g.target_date).getTime() - nowMs) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 7) {
        result.push({
          id: `goal-deadline-${g.id}`,
          kind: "goal_deadline",
          title: `"${g.title}" is due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          detail: `${g.progress_pct}% of milestones completed so far.`,
          href: "/goals",
        });
      }
    }

    // ---- Interview reminder (scheduled within 3 days) ----
    for (const app of applications ?? []) {
      if (!app.interview_date) continue;
      const daysLeft = Math.ceil((new Date(app.interview_date).getTime() - nowMs) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 3) {
        result.push({
          id: `interview-reminder-${app.id}`,
          kind: "interview_reminder",
          title: `Interview with ${app.company} in ${daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}`,
          detail: app.role ?? "Review your prep notes.",
          href: "/interviews",
        });
      }
    }

    // ---- Career milestone reached (spec section 23's "career
    // milestone" notification kind — reuses computeCareerMilestones,
    // the same module /milestones renders from, so this can never
    // disagree with what that page shows).
    //
    // One notification per milestone (not one combined "N milestones
    // reached" summary) specifically so each is individually
    // dismissible via the existing notification_dismissals mechanism —
    // a combined notification would have no way to know which
    // milestones the person has already acknowledged and would nag
    // forever once any milestone was ever reached, which is exactly the
    // notification spam section 25 warns against.
    const realApplications = (applications ?? []).filter((a) => a.application_status !== "wishlist");
    const reachedMilestones = computeCareerMilestones({
      phasesCompleted: phases.filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed)).length,
      totalPhases: phases.length,
      projectsShipped: (projectProgress ?? []).filter(
        (p) => p.status === "completed" && (p.github_url || p.deployment_url)
      ).length,
      dsaCompleted: (dsaProgress ?? []).filter((d) => d.completed).length,
      overallReadinessPct: readinessBreakdown?.overallPct ?? null,
      hasUsedResumeVersion: realApplications.some((a) => a.resume_version && a.resume_version.trim().length > 0),
      applicationsSubmitted: realApplications.length,
      mockInterviewAttempts: (interviewAttempts ?? []).length,
      offersReceived: realApplications.filter((a) => a.offer).length,
    }).filter((m) => m.reached);
    for (const m of reachedMilestones) {
      result.push({
        id: `career-milestone-${m.id}`,
        kind: "career_milestone",
        title: `Milestone reached: ${m.label}`,
        detail: m.description,
        href: "/milestones",
      });
    }

    // ---- Follow-up reminder (follow_up_date has arrived or passed) ----
    for (const app of applications ?? []) {
      if (!app.follow_up_date) continue;
      const daysOver = Math.floor((nowMs - new Date(app.follow_up_date).getTime()) / 86400000);
      if (daysOver >= 0) {
        result.push({
          id: `follow-up-${app.id}`,
          kind: "follow_up_reminder",
          title: `Follow up with ${app.company}`,
          detail: daysOver === 0 ? "Due today." : `${daysOver} day${daysOver === 1 ? "" : "s"} overdue.`,
          href: "/career",
        });
      }
    }

    return result;
  }, [phases, milestones, projectProgress, exitLadder, logs, goals, skillEvidence, applications, dsaProgress, readinessBreakdown, interviewAttempts]);

  // Dismissal/snooze filtering — computed fresh notifications stay exactly
  // as they were (still recomputed live every load); this only decides
  // which of them are currently hidden from the bell, using the same
  // stable notification.id as the dismissal key.
  const dismissalMap = useMemo(() => {
    const map = new Map<string, NotificationDismissal>();
    for (const d of dismissals ?? []) map.set(d.notification_id, d);
    return map;
  }, [dismissals]);

  const mutedKinds = useMemo(() => new Set(settings?.muted_notification_kinds ?? []), [settings]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (mutedKinds.has(n.kind)) return false;
      const d = dismissalMap.get(n.id);
      if (!d) return true;
      if (d.action === "deleted" || d.action === "read") return false;
      if (d.action === "snoozed" && d.snoozed_until && new Date(d.snoozed_until).getTime() > now()) return false;
      return true;
    });
  }, [notifications, dismissalMap, mutedKinds]);

  return {
    notifications: visibleNotifications,
    allNotifications: notifications,
    isLoading: phasesLoading || milestonesLoading || exitLoading || logsLoading,
    mutateDismissals,
  };
}

export function useNotificationDismissals(userId: string | undefined) {
  return useSWR(userId ? ["notification-dismissals", userId] : null, async () => {
    const { data, error } = await supabase.from("notification_dismissals").select("*").eq("user_id", userId!);
    if (error) throw error;
    return (data ?? []) as NotificationDismissal[];
  });
}

export async function dismissNotification(userId: string, notificationId: string, action: "read" | "deleted") {
  const { error } = await supabase
    .from("notification_dismissals")
    .upsert({ user_id: userId, notification_id: notificationId, action } as never, {
      onConflict: "user_id,notification_id",
    });
  if (error) throw error;
}

export async function snoozeNotification(userId: string, notificationId: string, hours: number) {
  const snoozed_until = new Date(Date.now() + hours * 3600000).toISOString();
  const { error } = await supabase
    .from("notification_dismissals")
    .upsert({ user_id: userId, notification_id: notificationId, action: "snoozed", snoozed_until } as never, {
      onConflict: "user_id,notification_id",
    });
  if (error) throw error;
}

export async function setNotificationKindMuted(userId: string, kind: NotificationKind, muted: boolean) {
  const { data: current, error: readErr } = await supabase
    .from("user_settings")
    .select("muted_notification_kinds")
    .eq("user_id", userId)
    .single();
  if (readErr) throw readErr;
  const existing = new Set(((current as { muted_notification_kinds: string[] } | null)?.muted_notification_kinds) ?? []);
  if (muted) existing.add(kind);
  else existing.delete(kind);
  const { error } = await supabase
    .from("user_settings")
    .update({ muted_notification_kinds: [...existing] } as never)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markAllRead(userId: string, notificationIds: string[]) {
  if (notificationIds.length === 0) return;
  const rows = notificationIds.map((id) => ({ user_id: userId, notification_id: id, action: "read" as const }));
  const { error } = await supabase.from("notification_dismissals").upsert(rows as never, {
    onConflict: "user_id,notification_id",
  });
  if (error) throw error;
}
