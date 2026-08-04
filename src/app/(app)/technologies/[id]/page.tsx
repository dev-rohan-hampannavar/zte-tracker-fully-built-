"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { useTechnology, useTechnologies, useTopicsForTechnology } from "@/lib/hooks/use-roadmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, ArrowLeft, ArrowRight, ListChecks, Link2 } from "lucide-react";
import type { StageProject } from "@/types/database";

const supabase = createClient();

export default function TechnologyDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: technology, isLoading: techLoading } = useTechnology(params.id);
  const { data: topics, isLoading: topicsLoading } = useTopicsForTechnology(params.id);
  const { data: allTechnologies } = useTechnologies();

  // Phase titles for the topics this technology appears in (small, targeted lookup —
  // avoids pulling the full progress-joined roadmap tree just for titles).
  const phaseIds = useMemo(() => [...new Set((topics ?? []).map((t) => t.phase_id))], [topics]);
  const { data: phaseTitles } = useSWR<Map<string, string>>(
    phaseIds.length ? ["phase-titles", phaseIds] : null,
    async () => {
      const { data, error } = await supabase.from("phases").select("id, title").in("id", phaseIds);
      if (error) throw error;
      return new Map((data ?? []).map((p: { id: string; title: string }) => [p.id, p.title]));
    }
  );

  // Projects that reference this technology, via the same topic_technologies join,
  // matched against each project's own linked stage — no separate project<->tech table exists.
  const { data: linkedProjects } = useSWR(
    params.id ? ["projects-for-technology", params.id] : null,
    async () => {
      const { data: joinRows, error: jErr } = await supabase
        .from("topic_technologies")
        .select("topic_id")
        .eq("technology_id", params.id);
      if (jErr) throw jErr;
      const topicIds = ((joinRows ?? []) as { topic_id: string }[]).map((r) => r.topic_id);
      if (topicIds.length === 0) return [];
      const { data: relatedTopics, error: tErr } = await supabase
        .from("topics")
        .select("stage_id")
        .in("id", topicIds);
      if (tErr) throw tErr;
      const stageIdSet = [
        ...new Set(
          ((relatedTopics ?? []) as { stage_id: string | null }[])
            .map((t) => t.stage_id)
            .filter((id): id is string => !!id)
        ),
      ];
      if (stageIdSet.length === 0) return [];
      const { data: projects, error: pErr } = await supabase
        .from("stage_projects")
        .select("*")
        .in("stage_id", stageIdSet);
      if (pErr) throw pErr;
      return (projects ?? []) as StageProject[];
    }
  );

  // "Related Technologies" — simple co-occurrence: technologies appearing in the same
  // topics as this one, ranked by how often they co-occur. No hand-authored graph.
  const { data: relatedTechIds } = useSWR(
    params.id && topics ? ["related-tech-ids", params.id, topics.map((t) => t.id).join(",")] : null,
    async () => {
      const topicIds = (topics ?? []).map((t) => t.id);
      if (topicIds.length === 0) return [];
      const { data, error } = await supabase
        .from("topic_technologies")
        .select("technology_id")
        .in("topic_id", topicIds)
        .neq("technology_id", params.id as string);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of (data ?? []) as { technology_id: string }[]) {
        counts.set(row.technology_id, (counts.get(row.technology_id) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    }
  );

  const relatedTechnologies = useMemo(() => {
    if (!relatedTechIds || !allTechnologies) return [];
    const map = new Map(allTechnologies.map((t) => [t.id, t]));
    return relatedTechIds.map((id) => map.get(id)).filter((t): t is NonNullable<typeof t> => !!t);
  }, [relatedTechIds, allTechnologies]);

  if (techLoading) return <Skeleton className="h-48 w-full" />;
  if (!technology) {
    return <p className="text-sm text-muted">Technology not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/technologies" className="text-xs text-muted hover:text-foreground flex items-center gap-1 w-fit">
        <ArrowLeft className="h-3 w-3" /> All technologies
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
          <Cpu className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{technology.name}</h1>
          {technology.category && (
            <Badge variant="outline" className="mt-1">
              {technology.category}
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Topics referencing {technology.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topicsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !topics || topics.length === 0 ? (
            <p className="text-sm text-muted">No topics reference this technology yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topics.map((t) => (
                <Link key={t.id} href={`/roadmap/topic/${t.id}`}>
                  <div className="flex items-center gap-3 rounded-md border border-border p-3 hover:border-accent/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      {phaseTitles?.get(t.phase_id) && (
                        <p className="text-xs text-muted mt-0.5 truncate">{phaseTitles.get(t.phase_id)}</p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {linkedProjects && linkedProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projects in the same stages</CardTitle>
            <p className="text-xs text-muted mt-1">
              Stage projects from stages where {technology.name} is used — no direct
              project↔technology link exists in the schema, so this is stage-level, not topic-level.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {linkedProjects.map((p) => (
              <Link key={p.id} href="/projects">
                <div className="flex items-center gap-3 rounded-md border border-border p-3 hover:border-accent/40 transition-colors">
                  <p className="text-sm flex-1 min-w-0 truncate">{p.name}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {relatedTechnologies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Related technologies
            </CardTitle>
            <p className="text-xs text-muted mt-1">
              Technologies that appear alongside {technology.name} in the same topics — by
              co-occurrence, not a hand-authored graph.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {relatedTechnologies.map((t) => (
              <Link key={t.id} href={`/technologies/${t.id}`}>
                <Badge variant="outline" className="hover:border-accent/40 cursor-pointer">
                  {t.name}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
