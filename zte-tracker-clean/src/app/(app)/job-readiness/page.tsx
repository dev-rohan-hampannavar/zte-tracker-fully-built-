"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useTargetRoles, useJobReadiness } from "@/lib/hooks/use-job-readiness";
import { useTechnologies } from "@/lib/hooks/use-roadmap";
import { useSkillEvidence } from "@/lib/hooks/use-skills";
import { analyzeJobDescription } from "@/lib/job-description-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RadialProgress } from "@/components/ui/radial-progress";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { CheckCircle2, Lightbulb, Search, TrendingDown } from "lucide-react";

function scoreVariant(score: number | null): "success" | "warning" | "danger" | "outline" {
  if (score === null) return "outline";
  if (score >= 75) return "success";
  if (score >= 45) return "warning";
  return "danger";
}

function scoreColor(score: number): string {
  if (score >= 75) return "var(--success)";
  if (score >= 45) return "var(--warning)";
  return "var(--danger)";
}

export default function JobReadinessPage() {
  const { user } = useUser();
  const { data: roles, isLoading: rolesLoading } = useTargetRoles();
  const { data: technologies } = useTechnologies();
  const { data: skillEvidence } = useSkillEvidence(user?.id);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [jobDescription, setJobDescription] = useState("");
  const [analyzedDescription, setAnalyzedDescription] = useState("");

  // Default to the first role once roles load, without a setState-in-effect
  // cascade: derive the effective id directly rather than syncing state.
  const roleId = selectedRoleId ?? roles?.[0]?.id;
  const selectedRole = roles?.find((r) => r.id === roleId);
  const { breakdown, isLoading } = useJobReadiness(user?.id, selectedRole);
  const jobAnalysis = useMemo(
    () =>
      analyzedDescription && technologies && skillEvidence
        ? analyzeJobDescription(analyzedDescription, technologies, skillEvidence)
        : null,
    [analyzedDescription, technologies, skillEvidence]
  );

  if (rolesLoading || (roleId && isLoading)) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-page-title font-semibold tracking-tight">Job Readiness</h1>
            <p className="text-sm text-muted mt-1">
              One explainable score — every pillar below shows exactly why it&apos;s what it is.
            </p>
          </div>
          <Select value={roleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select target role" />
            </SelectTrigger>
            <SelectContent>
              {(roles ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeUp>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Job description analyzer
          </CardTitle>
          <p className="text-sm text-muted">
            Paste a role description to compare its canonical technology requirements with your live skill evidence.
            Matches are transparent and local — there is no opaque AI score.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the responsibilities and requirements from a job posting…"
            className="min-h-28 resize-y"
            aria-label="Job description"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted">Only skills already in the ZTE technology catalog are matched.</p>
            <Button
              type="button"
              size="sm"
              onClick={() => setAnalyzedDescription(jobDescription)}
              disabled={!jobDescription.trim() || !technologies || !skillEvidence}
            >
              Analyze description
            </Button>
          </div>
          {jobAnalysis && (
            <div className="rounded-lg border border-border bg-surface-2 p-4 flex flex-col gap-3" aria-live="polite">
              {jobAnalysis.matched.length === 0 ? (
                <p className="text-sm text-muted">
                  No catalog technologies were detected. Try including the exact technology names from the posting.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="success">{jobAnalysis.strong.length} strong</Badge>
                    <Badge variant="outline">{jobAnalysis.moderate.length} moderate</Badge>
                    <Badge variant={jobAnalysis.weak.length ? "warning" : "success"}>
                      {jobAnalysis.weak.length} weak/missing
                    </Badge>
                    <span className="text-xs text-muted">{jobAnalysis.matched.length} catalog matches</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {jobAnalysis.matched.map((skill) => {
                      const iconClass =
                        skill.status === "strong"
                          ? "text-success"
                          : skill.status === "moderate"
                            ? "text-muted"
                            : "text-warning";
                      const badgeVariant = skill.status === "strong" ? "success" : skill.status === "moderate" ? "outline" : "warning";
                      const content = (
                        <div className="flex items-center justify-between gap-2 text-sm w-full">
                          <span className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
                            <span className="truncate">{skill.technologyName}</span>
                          </span>
                          <Badge variant={badgeVariant}>{skill.knowledgePct}%</Badge>
                        </div>
                      );
                      // Weak matches are exactly "what do I need to improve
                      // before applying" — link straight to that
                      // technology's page (roadmap topics that teach it)
                      // rather than leaving the person to go find it
                      // themselves.
                      return skill.status === "weak" ? (
                        <Link
                          key={skill.technologyId}
                          href={`/technologies/${skill.technologyId}`}
                          className="rounded-md -mx-1 px-1 hover:bg-surface transition-colors"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={skill.technologyId}>{content}</div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {breakdown && (
        <StaggerContainer className="flex flex-col gap-6">
          {/* Hero — the animated glowing ring is this page's one signature
              moment; everything below stays flat/restrained. */}
          <StaggerItem>
            <div className="relative overflow-hidden rounded-card border border-accent/30 bg-surface bg-mesh p-8 flex flex-col items-center gap-3">
              <RadialProgress
                value={breakdown.overallPct}
                size={160}
                stroke={12}
                color={scoreColor(breakdown.overallPct)}
                glow
              />
              <p className="text-sm text-muted mt-2">{breakdown.roleName} readiness</p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-warning/30 glow-card">
              <CardContent noHeader className="flex items-start gap-3">
                <Lightbulb className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Recommended next action</p>
                  <p className="text-sm">{breakdown.recommendedAction}</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card>
              <CardHeader>
                <CardTitle>Pillar breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {breakdown.pillars.map((p) => (
                  <div key={p.key}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{p.label}</p>
                      <Badge variant={scoreVariant(p.score)}>{p.score === null ? "No data" : `${p.score}%`}</Badge>
                    </div>
                    {p.score !== null && <Progress value={p.score} className="h-1.5 mb-1" glow={p.score >= 75} />}
                    <p className="text-xs text-muted">{p.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" /> Biggest weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {breakdown.weakestPillars.length === 0 ? (
                  <p className="text-sm text-muted">Not enough data yet to identify weaknesses.</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {breakdown.weakestPillars.map((p, i) => (
                      <li key={p.key} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/15 text-danger text-xs font-medium shrink-0">
                          {i + 1}
                        </span>
                        {p.label} — {p.score}%
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <p className="text-xs text-muted">
              Skills are weighted by relevance to {breakdown.roleName} (a curated, editable list — not every skill
              counts equally). Interview and resume pillars only show a real percentage once you have logged
              interview rounds or recorded a resume version on an application; until then they&apos;re marked
              &quot;No data&quot; rather than scored as failing.
            </p>
          </StaggerItem>
        </StaggerContainer>
      )}
    </div>
  );
}
