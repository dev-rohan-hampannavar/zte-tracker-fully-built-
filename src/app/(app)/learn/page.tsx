"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ALL_LESSONS, lessonsForPath, pathsWithLessons } from "@/content/shared/lessons";
import { getRolePathForProfile, pathId } from "@/content/shared/role-paths";
import { useOnboardingResponses } from "@/lib/hooks/use-onboarding";
import { useRoleProfile } from "@/lib/hooks/use-role-profile";
import { useLessonProgress } from "@/lib/hooks/use-lesson-progress";
import { useUser } from "@/lib/hooks/use-user";

export default function LearnPage() {
  const { user, loading } = useUser();
  const { data: answers } = useOnboardingResponses(user?.id);
  const { data: info } = useRoleProfile(answers?.target_role_id);
  const { progress } = useLessonProgress(user?.id);
  const paths = pathsWithLessons();
  const [picked, setPicked] = useState<string | null>(null);
  const mine = getRolePathForProfile(info?.role?.profile_id, info?.family?.id);
  const mineId = mine ? pathId(mine) : null;
  const familyFallback = mine ? paths.find((p) => p.familyId === mine.familyId && !p.profileIds) : undefined;
  const defaultId = mineId && paths.some((p) => pathId(p) === mineId) ? mineId : familyFallback ? pathId(familyFallback) : pathId(paths[0]);
  const selectedId = picked ?? defaultId;
  const path = paths.find((p) => pathId(p) === selectedId) ?? paths[0];

  const lessons = lessonsForPath(path);
  const modules = [...new Set(lessons.map((l) => l.module))];
  const completed = lessons.filter((l) => progress[l.id]).length;

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Lessons</h1>
        <p className="mt-1 text-sm text-muted">
          Short, worked lessons for the skills the core roadmap doesn&apos;t cover for your role. Read, try the example, practise, then check yourself.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a path">
        {paths.map((p) => {
          const id = pathId(p);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={pathId(path) === id}
              onClick={() => setPicked(id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${pathId(path) === id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:bg-surface-2"}`}
            >
              {p.title}{mineId === id ? " · your path" : ""}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{path.title}</span>
            <span className="text-muted">{completed} of {lessons.length} lessons complete</span>
          </div>
          <Progress value={lessons.length ? Math.round((completed / lessons.length) * 100) : 0} label="Lesson progress" />
        </CardContent>
      </Card>

      {modules.map((moduleTitle) => {
        const mod = path.addOns.find((m) => m.title === moduleTitle);
        return (
          <Card key={moduleTitle}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{moduleTitle}</CardTitle>
              {mod && <p className="text-sm text-muted">{mod.outcome}</p>}
            </CardHeader>
            <CardContent className="space-y-2">
              {lessons.filter((l) => l.module === moduleTitle).map((l) => (
                <Link key={l.id} href={`/learn/${l.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-sm hover:bg-surface-2">
                  <span className="flex items-center gap-2">
                    {progress[l.id] ? <Check className="size-4 text-success" aria-label="completed" /> : <span className="size-4 rounded-full border border-border" aria-hidden />}
                    {l.title}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {progress[l.id] && <Badge variant="outline">{progress[l.id].quiz_correct}/{progress[l.id].quiz_total}</Badge>}
                    {l.minutes} min
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {path.addOns.some((m) => !modules.includes(m.title)) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Coming next on this path</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm text-muted">
            {path.addOns.filter((m) => !modules.includes(m.title)).map((m) => (
              <p key={m.title}>• <span className="text-foreground">{m.title}</span>: {m.outcome}</p>
            ))}
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted">{ALL_LESSONS.length} lessons across {paths.length} paths so far.</p>
    </div>
  );
}
