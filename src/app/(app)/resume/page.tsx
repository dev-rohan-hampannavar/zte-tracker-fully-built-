"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useCareerTracker } from "@/lib/hooks/use-career";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useProjectProgress } from "@/lib/hooks/use-projects";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Check, FileDown } from "lucide-react";
import { FadeUp } from "@/components/motion/primitives";

export default function ResumePage() {
  const { user } = useUser();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: projectProgress, isLoading: projLoading } = useProjectProgress(user?.id);
  const { data: dsa, isLoading: dsaLoading } = useDsaProgress(user?.id);
  const { data: applications } = useCareerTracker(user?.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const loading = phasesLoading || projLoading || dsaLoading;

  const completedPhases = useMemo(
    () => phases.filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed)),
    [phases]
  );

  const dsaStats = useMemo(() => {
    const done = (dsa ?? []).filter((d) => d.completed);
    return {
      total: done.length,
      easy: done.filter((d) => d.difficulty === "easy").length,
      medium: done.filter((d) => d.difficulty === "medium").length,
      hard: done.filter((d) => d.difficulty === "hard").length,
    };
  }, [dsa]);

  // Resume version comparison (spec section 16). Deliberately derived from
  // career_tracker.resume_version — a free-text field the person already
  // fills in per application on /career — rather than a new dedicated
  // resume-version table, per the master spec's own "avoid duplicate
  // systems performing the same job" rule (section 2). Whatever string
  // they've typed there (e.g. "Backend v2") becomes a version's identity;
  // grouping and rate math is real, computed from actual application
  // outcomes, same pattern as ApplicationMetricsByPlan/careerFunnel
  // elsewhere in the app — nothing here is estimated or invented.
  const resumeVersionStats = useMemo(() => {
    const withVersion = (applications ?? []).filter(
      (a) => a.resume_version && a.resume_version.trim().length > 0 && a.application_status !== "wishlist"
    );
    const byVersion = new Map<string, typeof withVersion>();
    for (const app of withVersion) {
      const key = app.resume_version!.trim();
      const list = byVersion.get(key) ?? [];
      list.push(app);
      byVersion.set(key, list);
    }
    return [...byVersion.entries()]
      .map(([version, apps]) => {
        const total = apps.length;
        const responded = apps.filter((a) => a.application_status !== "applied").length;
        const interviewing = apps.filter((a) => ["screening", "interviewing", "offer"].includes(a.application_status)).length;
        const offers = apps.filter((a) => a.offer).length;
        const rejected = apps.filter((a) => a.application_status === "rejected").length;
        return {
          version,
          total,
          responseRatePct: total === 0 ? 0 : Math.round((100 * responded) / total),
          interviewRatePct: total === 0 ? 0 : Math.round((100 * interviewing) / total),
          offerRatePct: total === 0 ? 0 : Math.round((100 * offers) / total),
          rejected,
          offers,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [applications]);

  const bullets = useMemo(() => {
    // Built inside the memo (not hoisted above it as a plain variable) so
    // it doesn't defeat the memoization: a `new Map(...)` built on every
    // render fails reference-equality every time, which meant this whole
    // useMemo was silently recomputing bullets on every render regardless
    // of whether completedPhases/dsaStats/projectProgress/phases actually
    // changed — the memo was providing zero benefit.
    const projectMap = new Map((projectProgress ?? []).map((p) => [p.phase_id, p]));
    const items: { id: string; text: string; group: string }[] = [];

    completedPhases.forEach((phase) => {
      const progress = projectMap.get(phase.id);
      const hours = phase.topics.reduce((s, t) => s + (t.estimated_hours ?? 0), 0);
      let text = `Completed "${phase.title}" (${phase.band ?? "core"} track, ~${hours}h) — ${phase.topics.length} topics covering ${phase.title.toLowerCase()}`;
      if (phase.capstone) {
        text = `Built ${phase.capstone.title} as capstone for "${phase.title}" — ${phase.capstone.description.slice(0, 120)}${phase.capstone.description.length > 120 ? "…" : ""}`;
      }
      if (progress?.github_url || progress?.deployment_url) {
        text += progress.deployment_url ? ` (live: ${progress.deployment_url})` : ` (repo: ${progress.github_url})`;
      }
      items.push({ id: `phase-${phase.id}`, text, group: "Phases & Capstones" });
    });

    if (dsaStats.total > 0) {
      items.push({
        id: "dsa-summary",
        text: `Solved ${dsaStats.total} data structures & algorithms problems (${dsaStats.easy} easy, ${dsaStats.medium} medium, ${dsaStats.hard} hard) as part of structured interview prep`,
        group: "DSA",
      });
    }

    (projectProgress ?? [])
      .filter((p) => p.status === "completed" && (p.github_url || p.deployment_url))
      .forEach((p) => {
        const phase = phases.find((ph) => ph.id === p.phase_id);
        if (!phase) return;
        items.push({
          id: `deployed-${p.phase_id}`,
          text: `Deployed "${phase.title}" project${p.deployment_url ? ` at ${p.deployment_url}` : ""}${p.github_url ? ` (source: ${p.github_url})` : ""}`,
          group: "Deployed Work",
        });
      });

    return items;
  }, [completedPhases, dsaStats, projectProgress, phases]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(bullets.map((b) => b.id)));
  }

  const selectedText = bullets
    .filter((b) => selected.has(b.id))
    .map((b) => `• ${b.text}`)
    .join("\n");

  async function copySelected() {
    if (!selectedText) {
      toast.error("Select at least one bullet.");
      return;
    }
    await navigator.clipboard.writeText(selectedText);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadTxt() {
    if (!selectedText) {
      toast.error("Select at least one bullet.");
      return;
    }
    const blob = new Blob([selectedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-bullets.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const grouped = bullets.reduce<Record<string, typeof bullets>>((acc, b) => {
    (acc[b.group] ??= []).push(b);
    return acc;
  }, {});

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-page-title font-semibold tracking-tight">Resume Generator</h1>
          <p className="text-sm text-muted mt-1">
            Auto-drafted bullets from completed phases, capstones, deployed projects, and DSA progress.
            Select what&apos;s relevant, copy or export.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select all
          </Button>
          <Button variant="outline" size="sm" onClick={copySelected}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
          </Button>
          <Button size="sm" onClick={downloadTxt}>
            <FileDown className="h-4 w-4" /> Export .txt
          </Button>
        </div>
      </div>
      </FadeUp>

      {resumeVersionStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resume version performance</CardTitle>
            <p className="text-xs text-muted mt-1">
              Grouped by the resume version you set per application on the Jobs page — real outcomes, not
              estimates.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {resumeVersionStats.map((v) => (
              <div
                key={v.version}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 flex-wrap"
              >
                <span className="text-sm font-medium min-w-0 truncate">{v.version}</span>
                <Badge variant="outline" className="shrink-0">
                  {v.total} app{v.total === 1 ? "" : "s"}
                </Badge>
                <div className="ml-auto flex items-center gap-4 text-xs text-muted shrink-0">
                  <span>
                    <span className="font-mono-tabular text-foreground">{v.responseRatePct}%</span> response
                  </span>
                  <span>
                    <span className="font-mono-tabular text-foreground">{v.interviewRatePct}%</span> interview
                  </span>
                  <span>
                    <span className="font-mono-tabular text-foreground">{v.offerRatePct}%</span> offer
                  </span>
                  {v.offers > 0 && (
                    <Badge variant="success">
                      {v.offers} offer{v.offers === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {bullets.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            No resume-worthy items yet — complete a phase, deploy a project, or log DSA problems to
            generate bullets here.
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([group, items]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle>{group}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {items.map((b) => (
              <label
                key={b.id}
                className="flex items-start gap-3 rounded-card border border-border px-3.5 py-3 hover:bg-surface-hover hover:border-muted-2/40 transition-standard cursor-pointer"
              >
                <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggle(b.id)} className="mt-0.5" />
                <span className="text-sm">{b.text}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}

      {selected.size > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preview ({selected.size} selected)</CardTitle>
            <Badge variant="outline">{selectedText.length} chars</Badge>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground bg-surface-2 rounded-md p-3">
              {selectedText}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
