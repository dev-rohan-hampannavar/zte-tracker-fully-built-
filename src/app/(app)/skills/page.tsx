"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { pct, cn } from "@/lib/utils";
import { Layers, Gauge } from "lucide-react";

function readinessLabel(score: number) {
  if (score >= 90) return { label: "Ready to exit", variant: "success" as const };
  if (score >= 60) return { label: "On track", variant: "accent" as const };
  if (score >= 25) return { label: "In progress", variant: "warning" as const };
  return { label: "Not started", variant: "outline" as const };
}

export default function SkillsPage() {
  const { user } = useUser();
  const { phases, isLoading } = usePhasesWithProgress(user?.id);
  const { data: dsa } = useDsaProgress(user?.id);

  const bandMatrix = useMemo(() => {
    const map = new Map<string, { total: number; done: number; hardTopics: number; hardDone: number }>();
    for (const phase of phases) {
      const key = phase.band ?? "Unbanded";
      const entry = map.get(key) ?? { total: 0, done: 0, hardTopics: 0, hardDone: 0 };
      for (const t of phase.topics) {
        entry.total += 1;
        if (t.progress?.completed) entry.done += 1;
        if (t.progress?.difficulty === "hard") {
          entry.hardTopics += 1;
          if (t.progress?.completed) entry.hardDone += 1;
        }
      }
      map.set(key, entry);
    }
    return Array.from(map.entries());
  }, [phases]);

  const dsaByTag = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const p of dsa ?? []) {
      const key = p.topic_tag || "Untagged";
      const entry = map.get(key) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (p.completed) entry.done += 1;
      map.set(key, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [dsa]);

  // Phase readiness: weighted blend of topic completion, hard-topic completion,
  // and whether an exit point is attached (exit-linked phases need higher bar).
  const readiness = useMemo(() => {
    return phases.map((phase) => {
      const total = phase.topics.length;
      const done = phase.topics.filter((t) => t.progress?.completed).length;
      const hard = phase.topics.filter((t) => t.progress?.difficulty === "hard");
      const hardDone = hard.filter((t) => t.progress?.completed).length;
      const baseCompletion = total > 0 ? (done / total) * 100 : 0;
      const hardPenalty = hard.length > 0 ? (hardDone / hard.length) * 100 : baseCompletion;
      // Weight: 70% raw completion, 30% hard-topic mastery (hard topics matter more for readiness)
      const score = Math.round(baseCompletion * 0.7 + hardPenalty * 0.3);
      return { phase, score, done, total };
    });
  }, [phases]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Skills</h1>
        <p className="text-sm text-muted mt-1">
          Skill matrix by roadmap band, DSA coverage by tag, and phase readiness scores.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Skill matrix by band
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {bandMatrix.map(([band, m]) => (
            <div key={band}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{band}</p>
                <span className="text-xs text-muted font-mono-tabular">
                  {m.done}/{m.total} topics
                  {m.hardTopics > 0 && ` · ${m.hardDone}/${m.hardTopics} hard`}
                </span>
              </div>
              <Progress value={pct(m.done, m.total)} className="h-2" />
            </div>
          ))}
          <p className="text-xs text-muted mt-2">
            Note: roadmap.md doesn&apos;t tag topics with individual skills (React, SQL, etc.) — this
            matrix uses band (Foundation/Core/Advanced/Expert), the real grouping the source data has.
          </p>
        </CardContent>
      </Card>

      {dsaByTag.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>DSA coverage by topic tag</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dsaByTag.map(([tag, m]) => (
              <div key={tag}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm">{tag}</p>
                  <span className="text-xs text-muted font-mono-tabular">
                    {m.done}/{m.total}
                  </span>
                </div>
                <Progress value={pct(m.done, m.total)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Phase readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted mb-4">
            Weighted score: 70% overall topic completion + 30% hard-topic mastery. Exit-linked
            phases need a high score before that exit tier is realistically usable.
          </p>
          <div className="flex flex-col gap-2">
            {readiness.map(({ phase, score, done, total }) => {
              const r = readinessLabel(score);
              return (
                <Link key={phase.id} href={`/roadmap#${phase.id}`}>
                  <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2">
                    <span className="text-xs font-mono-tabular text-muted w-10 shrink-0">
                      {phase.phase_number}
                    </span>
                    <span className="flex-1 text-sm truncate">{phase.title}</span>
                    {phase.exit_point_code && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Exit {phase.exit_point_code}
                      </Badge>
                    )}
                    <span className="text-xs text-muted font-mono-tabular w-14 text-right shrink-0">
                      {done}/{total}
                    </span>
                    <Progress value={score} className="h-1.5 w-20 shrink-0" />
                    <Badge variant={r.variant} className={cn("shrink-0 w-28 justify-center")}>
                      {r.label}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
