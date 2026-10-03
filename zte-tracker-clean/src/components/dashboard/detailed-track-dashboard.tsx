"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, Clock3, GraduationCap } from "lucide-react";
import { useActiveUserRoadmap } from "@/lib/hooks/use-user-roadmap";
import { useDetailedRoadmap } from "@/lib/hooks/use-roadmap";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailedTrackDashboard({ userId }: { userId: string }) {
  const { data: enrollment } = useActiveUserRoadmap(userId);
  const { data: settings } = useUserSettings(userId);
  const { data: phases, isLoading } = useDetailedRoadmap(userId);

  const summary = useMemo(() => {
    const rows = phases ?? [];
    const allTopics = rows.flatMap((phase) => phase.modules.flatMap((module) => module.topics));
    const mastered = allTopics.filter((topic) => topic.progress?.status === "mastered").length;
    const startIndex = rows.findIndex((phase) => phase.id === enrollment?.starting_detailed_phase_id);
    const touchedBeforeStart = startIndex > 0 && rows.slice(0, startIndex).some((phase) =>
      phase.modules.some((module) => module.topics.some((topic) => topic.progress && topic.progress.status !== "not_started"))
    );
    const eligible = startIndex > 0 && !touchedBeforeStart ? rows.slice(startIndex) : rows;
    const next = eligible.flatMap((phase) => phase.modules.flatMap((module) =>
      module.topics.filter((topic) => topic.progress?.status !== "mastered").map((topic) => ({ topic, phase }))
    ))[0] ?? null;
    const projects = rows.flatMap((phase) => phase.projects.map((project) => ({ project, phase })));
    return { rows, allTopics, mastered, next, projects, percent: allTopics.length ? Math.round((mastered / allTopics.length) * 100) : 0 };
  }, [phases, enrollment?.starting_detailed_phase_id]);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl space-y-5"><Skeleton className="h-32" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-52" /></div>;
  }

  const firstName = settings?.display_name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Card className="overflow-hidden border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="space-y-2">
            <Badge variant="outline"><GraduationCap className="mr-1 size-3" /> Your selected learning track</Badge>
            <h1 className="text-2xl font-semibold tracking-tight">{firstName ? `Welcome back, ${firstName}` : "Your learning dashboard"}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">Follow your role-focused curriculum, practice each topic, and save evidence as you build real projects.</p>
          </div>
          <Button asChild><Link href="/learning-path">Open my learning path <ArrowRight className="ml-2 size-4" /></Link></Button>
        </CardContent>
      </Card>

      {!summary.rows.length ? (
        <Card><CardHeader><CardTitle>Learning path is being prepared</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Your account is enrolled, but the selected track has no published phases yet. Contact support or choose another role in onboarding.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Curriculum progress</p><p className="mt-2 text-2xl font-semibold">{summary.percent}%</p><Progress className="mt-3" value={summary.percent} /><p className="mt-2 text-xs text-muted-foreground">{summary.mastered} of {summary.allTopics.length} topics mastered</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Your phases</p><p className="mt-2 text-2xl font-semibold">{summary.rows.length}</p><p className="mt-2 text-xs text-muted-foreground">Ordered learning milestones</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Weekly study time</p><p className="mt-2 text-2xl font-semibold">{enrollment?.weekly_hours ?? "—"}<span className="ml-1 text-sm font-normal">hrs</span></p><p className="mt-2 text-xs text-muted-foreground">Update your availability in onboarding or settings</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Applied projects</p><p className="mt-2 text-2xl font-semibold">{summary.projects.length}</p><p className="mt-2 text-xs text-muted-foreground">Project briefs in your track</p></CardContent></Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="size-5 text-accent" /> Recommended next topic</CardTitle></CardHeader>
              <CardContent>
                {summary.next ? (
                  <div className="space-y-4">
                    <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{summary.next.phase.phase_number} · {summary.next.phase.title}</p><h2 className="mt-1 text-lg font-semibold">{summary.next.topic.title}</h2><p className="mt-2 text-sm text-muted-foreground">{summary.next.topic.estimated_minutes} minutes · {summary.next.topic.difficulty}</p></div>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{summary.next.topic.learning_objectives.slice(0, 3).map((objective) => <li key={objective}>{objective}</li>)}</ul>
                    <Button asChild variant="outline"><Link href="/learning-path">Continue learning <ArrowRight className="ml-2 size-4" /></Link></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm"><CheckCircle2 className="size-5 text-success" />You have mastered every topic in this track. Review your evidence and portfolio projects.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="size-5 text-accent" /> Next project</CardTitle></CardHeader>
              <CardContent>
                {summary.projects[0] ? <div className="space-y-3"><div><p className="font-medium">{summary.projects[0].project.title}</p><p className="mt-1 text-sm text-muted-foreground">{summary.projects[0].project.problem_statement}</p></div><p className="text-xs text-muted-foreground">{summary.projects[0].phase.title}</p><Button asChild variant="outline" size="sm"><Link href="/learning-path">View project brief <ArrowRight className="ml-2 size-4" /></Link></Button></div> : <p className="text-sm text-muted-foreground">Projects will appear here as this track is expanded.</p>}
                {enrollment?.target_date && <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" />Target date {new Date(`${enrollment.target_date}T00:00:00`).toLocaleDateString()}</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
