"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useCompany, useExitLadder, usePhasesWithProgress, useRoadmapMetadata } from "@/lib/hooks/use-roadmap";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { pct } from "@/lib/utils";
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  ListChecks,
  Code2,
  Map as MapIcon,
  Briefcase,
  Tag,
  TrendingUp,
  Layers,
  StickyNote,
} from "lucide-react";
import type { Company } from "@/types/database";

const DIFFICULTY_VARIANT: Record<NonNullable<Company["hiring_difficulty"]>, "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useUser();
  const { data: company, isLoading } = useCompany(params.id);
  const { data: exitLadder } = useExitLadder();
  const { phases } = usePhasesWithProgress(user?.id);
  const { data: metadata } = useRoadmapMetadata();
  const { data: dsaProblems } = useDsaProgress(user?.id);
  const { data: applications } = useCareerTracker(user?.id);

  const linkedExits = useMemo(
    () =>
      (exitLadder ?? []).filter((e) => e.target_companies?.toLowerCase().includes(company?.name.toLowerCase() ?? "")),
    [exitLadder, company]
  );

  // Item 3 follow-up: category/hiring_stage/typical_tech_stack/hiring_difficulty
  // were added to the schema and seeded in Stage 0 but never rendered here —
  // this comment used to (incorrectly) say the table was name-only. They're
  // rendered in a "Company profile" card below. hiring_difficulty is still
  // frequently null (correctly — the source document doesn't rate every
  // company), so that field stays optional rather than defaulting to a guess.
  // The checklist below is unchanged: it applies data that IS real and
  // already tracked — the person's own progress against whichever exit tier
  // targets this company, plus their own application record if one exists —
  // instead of a generic "here's what to expect" writeup with invented
  // specifics.
  const targetExit = linkedExits[0]; // highest-salary tier that names this company, if several
  const targetPhase = targetExit ? phases.find((p) => p.id === targetExit.linked_phase) : undefined;
  const phaseIdx = targetPhase ? phases.findIndex((p) => p.id === targetPhase.id) : -1;
  const relevantPhases = phaseIdx >= 0 ? phases.slice(0, phaseIdx + 1) : [];
  const completedRelevantTopics = relevantPhases.reduce(
    (sum, p) => sum + p.topics.filter((t) => t.progress?.completed).length,
    0
  );
  const totalRelevantTopics = relevantPhases.reduce((sum, p) => sum + p.topics.length, 0);

  const dsaCompleted = (dsaProblems ?? []).filter((p) => p.completed).length;
  const dsaTarget = (metadata?.dsa_easy_target ?? 0) + (metadata?.dsa_medium_target ?? 0);

  const existingApplication = (applications ?? []).find((a) =>
    a.company.toLowerCase().includes(company?.name.toLowerCase() ?? "")
  );

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!company) {
    return <p className="text-sm text-muted">Company not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/companies" className="text-xs text-muted hover:text-foreground flex items-center gap-1 w-fit">
        <ArrowLeft className="h-3 w-3" /> All companies
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
          <p className="text-sm text-muted">Referenced in roadmap.md</p>
        </div>
      </div>

      {(company.category ||
        company.hiring_stage ||
        company.hiring_difficulty ||
        (company.typical_tech_stack && company.typical_tech_stack.length > 0) ||
        company.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {company.category && (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted shrink-0" />
                  {company.category}
                </span>
              )}
              {company.hiring_stage && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  {company.hiring_stage}
                </span>
              )}
              {company.hiring_difficulty && (
                <Badge variant={DIFFICULTY_VARIANT[company.hiring_difficulty]} className="capitalize">
                  {company.hiring_difficulty} to hire
                </Badge>
              )}
            </div>

            {company.typical_tech_stack && company.typical_tech_stack.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1.5 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Typical tech stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {company.typical_tech_stack.map((tech) => (
                    <Badge key={tech} variant="outline" className="font-normal">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {company.notes && (
              <p className="text-xs text-muted pt-2 border-t border-border flex items-start gap-1.5">
                <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {company.notes}
              </p>
            )}

            {!company.hiring_difficulty && (
              <p className="text-[11px] text-muted/70">
                No hiring-difficulty rating — the source roadmap doesn&apos;t state one for this company, so
                none is shown rather than guessed.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {existingApplication && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="pt-4 flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                You have an application tracked: <span className="capitalize">{existingApplication.application_status}</span>
              </p>
              {existingApplication.interview_date && (
                <p className="text-xs text-muted mt-0.5">
                  Interview on {new Date(existingApplication.interview_date).toLocaleDateString("en-IN")}
                </p>
              )}
            </div>
            <Link href="/interviews" className="text-xs text-accent hover:underline shrink-0">
              View in Interviews →
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Exit tiers mentioning this company</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedExits.length === 0 ? (
            <p className="text-sm text-muted">
              No exit-ladder tier explicitly names {company.name} in its target companies list —
              it&apos;s mentioned elsewhere in the roadmap text.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {linkedExits.map((exit) => (
                <Link key={exit.exit_code} href={`/exit-ladder#${exit.exit_code}`}>
                  <div className="flex items-center gap-3 rounded-md border border-border p-3 hover:border-accent/40 transition-colors">
                    <Badge variant="outline" className="font-mono-tabular shrink-0">
                      Exit {exit.exit_code}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{exit.job_level}</p>
                      <p className="text-xs text-accent font-mono-tabular">{exit.salary_range}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {targetExit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Prep checklist for Exit {targetExit.exit_code}
            </CardTitle>
            <p className="text-xs text-muted mt-1">
              Your own progress against the tier that names {company.name}
              {company.hiring_difficulty
                ? " — shown alongside the hiring-difficulty rating above, where one exists."
                : ", shown here since no hiring-difficulty rating exists in the source for this company."}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted flex items-center gap-1">
                  <MapIcon className="h-3 w-3" /> Roadmap topics through this tier
                </span>
                <span className="text-xs font-mono-tabular">
                  {completedRelevantTopics}/{totalRelevantTopics}
                </span>
              </div>
              <Progress value={pct(completedRelevantTopics, totalRelevantTopics)} className="h-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted flex items-center gap-1">
                  <Code2 className="h-3 w-3" /> DSA problems (roadmap-wide target)
                </span>
                <span className="text-xs font-mono-tabular">
                  {dsaCompleted}/{dsaTarget || "—"}
                </span>
              </div>
              <Progress value={pct(dsaCompleted, dsaTarget)} className="h-1.5" />
            </div>
            {targetExit.highlights && (
              <p className="text-xs text-muted pt-2 border-t border-border">{targetExit.highlights}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}