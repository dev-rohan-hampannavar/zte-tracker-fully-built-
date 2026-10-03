"use client";

import { useMemo } from "react";
import { CalendarDays, Clock3, Flag, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOnboardingResponses, useTargetRoles } from "@/lib/hooks/use-onboarding";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { useActiveUserRoadmap } from "@/lib/hooks/use-user-roadmap";
import { useRoleProfile } from "@/lib/hooks/use-role-profile";
import { buildPersonalPlan, type PlanPace } from "@/lib/personal-plan";

const PACE_LABEL: Record<PlanPace, string> = {
  on_track: "On track",
  tight: "Tight",
  behind: "Needs attention",
  no_target: "No target date",
  no_data: "Pacing pending",
};
const PACE_CLASS: Record<PlanPace, string> = {
  on_track: "border-success/40 text-success",
  tight: "border-warning/40 text-warning",
  behind: "border-danger/40 text-danger",
  no_target: "border-border text-muted",
  no_data: "border-border text-muted",
};

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * "Your plan" card for shared-workspace users. Everything shown is derived
 * from this user's own onboarding answers and progress.
 */
export function PersonalPlanCard({
  userId,
  remainingHours,
  completedTopics,
  totalTopics,
  nextTopicTitle,
}: {
  userId: string;
  remainingHours?: number | null;
  completedTopics?: number | null;
  totalTopics?: number | null;
  nextTopicTitle?: string | null;
}) {
  const { data: settings } = useUserSettings(userId);
  const { data: answers } = useOnboardingResponses(userId);
  const { data: roles } = useTargetRoles();
  const { data: enrollment } = useActiveUserRoadmap(userId);
  const { data: roleInfo } = useRoleProfile(answers?.target_role_id);

  const plan = useMemo(() => {
    if (!answers) return null;
    return buildPersonalPlan({
      firstName: settings?.display_name?.trim().split(/\s+/)[0] ?? null,
      roleName: roles?.find((r) => r.id === answers.target_role_id)?.name ?? null,
      goal: answers.goal,
      goalOther: answers.goal_other,
      experience: answers.experience_level,
      weeklyHours: enrollment?.weekly_hours ?? answers.weekly_hours,
      targetDate: enrollment?.target_date ?? answers.target_date,
      dsaLevel: answers.dsa_level,
      interviewReadiness: answers.interview_readiness,
      careerSituation: answers.career_situation,
      remainingHours,
      completedTopics,
      totalTopics,
      nextTopicTitle,
    });
  }, [answers, settings?.display_name, roles, enrollment, remainingHours, completedTopics, totalTopics, nextTopicTitle]);

  if (!plan) return null;
  const focus = roleInfo?.profile?.core_skills?.slice(0, 6) ?? [];

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{plan.headline}</CardTitle>
          <Badge variant="outline" className={PACE_CLASS[plan.pace]}>{PACE_LABEL[plan.pace]}</Badge>
        </div>
        <p className="text-sm text-muted">{plan.subhead}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="size-3.5" /> Time left</p>
            <p className="mt-1 text-lg font-semibold">{plan.weeksLeft != null ? `${plan.weeksLeft} wk` : "—"}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted"><Clock3 className="size-3.5" /> Hours per week needed</p>
            <p className="mt-1 text-lg font-semibold">{plan.neededWeeklyHours != null ? `${plan.neededWeeklyHours}h` : "—"}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted"><Target className="size-3.5" /> Complete</p>
            <p className="mt-1 text-lg font-semibold">{plan.percentDone != null ? `${plan.percentDone}%` : "—"}</p>
            {plan.percentDone != null && <Progress value={plan.percentDone} label="Your overall progress" className="mt-2" />}
          </div>
        </div>

        <p className="text-sm">{plan.paceMessage}</p>

        {plan.checkpoints.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted"><Flag className="size-3.5" /> Your checkpoints</p>
            <ol className="grid gap-2 sm:grid-cols-4">
              {plan.checkpoints.map((c) => (
                <li key={c.label} className="rounded-lg border border-border/60 p-2.5 text-xs">
                  <p className="font-medium">{c.label}</p>
                  <p className="text-muted">{fmt(c.date)}</p>
                  <p className="mt-1 text-accent">≈ {c.targetPercent}% complete</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {plan.rhythm.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Your weekly rhythm</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {plan.rhythm.map((b) => (
                <div key={b.id} className="rounded-lg border border-border/60 p-2.5 text-xs">
                  <p className="font-medium">{b.label} · {b.hours}h</p>
                  <p className="mt-1 text-muted">{b.what}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {focus.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Skills your target role rewards</p>
            <div className="flex flex-wrap gap-1.5">
              {focus.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
            </div>
          </div>
        )}

        {plan.nextActions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Do this next</p>
            <ul className="space-y-1.5 text-sm">
              {plan.nextActions.map((a) => <li key={a} className="flex gap-2"><span className="text-accent">•</span><span>{a}</span></li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
