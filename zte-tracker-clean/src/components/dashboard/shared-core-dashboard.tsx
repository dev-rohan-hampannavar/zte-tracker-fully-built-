"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, Clock3, GraduationCap } from "lucide-react";
import { useOnboardingResponses, useTargetRoles } from "@/lib/hooks/use-onboarding";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useActiveUserRoadmap } from "@/lib/hooks/use-user-roadmap";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared-user home for accounts on the reusable core curriculum. */
export function SharedCoreDashboard({ userId }: { userId: string }) {
  const { data: settings, isLoading: settingsLoading } = useUserSettings(userId);
  const { data: answers, isLoading: answersLoading } = useOnboardingResponses(userId);
  const { data: roles } = useTargetRoles();
  const { data: enrollment, isLoading: enrollmentLoading } = useActiveUserRoadmap(userId);
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(userId);

  const summary = useMemo(() => {
    const allTopics = phases.flatMap((phase) => phase.topics);
    const completed = allTopics.filter((topic) => topic.progress?.completed).length;
    const startIndex = phases.findIndex((phase) => phase.id === enrollment?.starting_phase_id);
    const eligiblePhases = startIndex > 0 ? phases.slice(startIndex) : phases;
    const next = eligiblePhases.flatMap((phase) =>
      phase.topics.filter((topic) => !topic.progress?.completed).map((topic) => ({ topic, phase }))
    )[0] ?? null;
    const role = roles?.find((candidate) => candidate.id === answers?.target_role_id);
    return {
      allTopics,
      completed,
      next,
      roleName: role?.name ?? null,
      percent: allTopics.length ? Math.round((completed / allTopics.length) * 100) : 0,
    };
  }, [answers?.target_role_id, enrollment?.starting_phase_id, phases, roles]);

  if (settingsLoading || answersLoading || enrollmentLoading || phasesLoading) {
    return <div className="mx-auto max-w-6xl space-y-5"><Skeleton className="h-36" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-52" /></div>;
  }

  const firstName = settings?.display_name?.trim().split(/\s+/)[0];
  const targetDate = enrollment?.target_date
    ? new Date(`${enrollment.target_date}T00:00:00`).toLocaleDateString()
    : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Card className="overflow-hidden border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="space-y-2">
            <Badge variant="outline"><GraduationCap className="mr-1 size-3" /> Shared learning workspace</Badge>
            <h1 className="text-2xl font-semibold tracking-tight">{firstName ? `Welcome, ${firstName}` : "Your learning dashboard"}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {summary.roleName
                ? `Your ${summary.roleName} path uses the shared curriculum and your own progress, goals, and study plan.`
                : "Your shared curriculum and study plan are connected to your own progress and goals."}
            </p>
          </div>
          <Button asChild><Link href="/roadmap">Open my roadmap <ArrowRight className="ml-2 size-4" /></Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Your progress</p><p className="mt-2 text-2xl font-semibold">{summary.percent}%</p><Progress className="mt-3" value={summary.percent} /><p className="mt-2 text-xs text-muted-foreground">{summary.completed} of {summary.allTopics.length} topics completed</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><BriefcaseBusiness className="size-4" /> Career focus</p><p className="mt-2 text-lg font-semibold">{summary.roleName ?? "Choose a role"}</p><p className="mt-2 text-xs text-muted-foreground">Set from your onboarding answers</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" /> Weekly availability</p><p className="mt-2 text-2xl font-semibold">{enrollment?.weekly_hours ?? "—"}<span className="ml-1 text-sm font-normal">hrs</span></p><p className="mt-2 text-xs text-muted-foreground">Your enrolled study pace</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> Target date</p><p className="mt-2 text-lg font-semibold">{targetDate ?? "Not set"}</p><p className="mt-2 text-xs text-muted-foreground">Your own learning target</p></CardContent></Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="size-5 text-accent" /> Recommended next topic</CardTitle></CardHeader>
          <CardContent>
            {summary.next ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{summary.next.phase.phase_number} · {summary.next.phase.title}</p>
                  <h2 className="mt-1 text-lg font-semibold">{summary.next.topic.title}</h2>
                </div>
                <Button asChild variant="outline"><Link href="/roadmap">Continue learning <ArrowRight className="ml-2 size-4" /></Link></Button>
              </div>
            ) : summary.allTopics.length ? (
              <p className="text-sm text-muted-foreground">You have completed every topic in this curriculum. Review your projects and saved evidence next.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Your curriculum is not available yet. Choose a role with a published learning path to continue.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Your workspace</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Your progress, notes, goals, projects, and career activity belong to your account.</p>
            <Button asChild variant="outline" size="sm"><Link href="/careers">Browse career paths <ArrowRight className="ml-2 size-4" /></Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
