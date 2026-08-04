"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import {
  useAdvancedProject,
  useAdvancedProjectProgress,
  upsertAdvancedProjectProgress,
} from "@/lib/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, ExternalLink, GitBranch } from "lucide-react";
import { toast } from "sonner";
import type { AdvancedProjectStatus, AdvancedProjectProgress } from "@/types/database";

const STATUS_OPTIONS: AdvancedProjectStatus[] = ["not_started", "considering", "in_progress", "completed", "abandoned"];
const STATUS_LABEL: Record<AdvancedProjectStatus, string> = {
  not_started: "Not started",
  considering: "Considering",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
};

export default function PortfolioIdeaDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useUser();
  const { data: project, isLoading } = useAdvancedProject(params.id);
  const { data: progress, mutate } = useAdvancedProjectProgress(user?.id);
  const [saving, setSaving] = useState(false);

  const own = (progress ?? []).find((p) => p.project_id === params.id);

  const handleSave = async (patch: Partial<AdvancedProjectProgress>) => {
    if (!user) return;
    setSaving(true);
    try {
      await upsertAdvancedProjectProgress(user.id, params.id, patch);
      await mutate();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !project) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/portfolio/ideas" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground w-fit">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Portfolio Projects
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted">{project.tagline}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Track your progress</CardTitle>
          {saving && <p className="text-xs text-muted mt-1">Saving…</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Status</label>
              <Select
                value={own?.status ?? "not_started"}
                onValueChange={(v) => handleSave({ status: v as AdvancedProjectStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div />
            <div>
              <label className="text-xs text-muted mb-1 block flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> GitHub repo
              </label>
              <Input
                key={own?.github_url ?? "github-empty"}
                defaultValue={own?.github_url ?? ""}
                placeholder="https://github.com/…"
                onBlur={(e) => handleSave({ github_url: e.target.value || null })}
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Deployment URL
              </label>
              <Input
                key={own?.deployment_url ?? "deployment-empty"}
                defaultValue={own?.deployment_url ?? ""}
                placeholder="https://…"
                onBlur={(e) => handleSave({ deployment_url: e.target.value || null })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Notes</label>
            <Textarea
              key={own?.notes ?? "notes-empty"}
              defaultValue={own?.notes ?? ""}
              rows={3}
              onBlur={(e) => handleSave({ notes: e.target.value || null })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>The problem</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted leading-relaxed">{project.problem}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Who exactly</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted leading-relaxed">{project.who_exactly}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>What exists</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted leading-relaxed">{project.what_exists}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>The gap</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted leading-relaxed">{project.the_gap}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Core features</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1.5">
            {project.core_features.map((f, i) => (
              <li key={i} className="text-sm text-muted flex gap-2">
                <span className="text-accent shrink-0">·</span> {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Advanced features</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1.5">
            {project.advanced_features.map((f, i) => (
              <li key={i} className="text-sm text-muted flex gap-2">
                <span className="text-accent shrink-0">·</span> {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ZTD skills this exercises</CardTitle>
          <p className="text-xs text-muted mt-1">Which roadmap phase each feature draws on.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4">Phase</th>
                </tr>
              </thead>
              <tbody>
                {project.skill_mapping.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">{row.feature}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs font-normal">{row.phase}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader><CardTitle>Monetization</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted leading-relaxed">{project.monetization}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>First 5 users</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted leading-relaxed">{project.first_users}</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
