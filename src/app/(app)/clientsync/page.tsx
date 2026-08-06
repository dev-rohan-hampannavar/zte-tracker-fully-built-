"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useClientSyncMilestones, usePhasesWithProgress, useAllTopicNotes, useLinkRegistry, useRoadmap } from "@/lib/hooks/use-roadmap";
import { useProjectProgress, upsertProjectProgress } from "@/lib/hooks/use-projects";
import { computeBacklinks } from "@/lib/note-links";
import { ReferencedInPanel } from "@/components/roadmap/referenced-in-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUserSettings, pinItem, unpinItem, isPinned } from "@/lib/hooks/use-user-settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  GitBranch,
  ArrowRight,
  Play,
  Image as ImageIcon,
  Plus,
  X,
  Loader2,
  Pin,
  PinOff,
} from "lucide-react";
import type { ClientSyncMilestone, ProjectStatus } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const STATUS_VARIANT: Record<ProjectStatus, "default" | "warning" | "success"> = {
  not_started: "default",
  in_progress: "warning",
  completed: "success",
};

export default function ClientSyncPage() {
  const { user } = useUser();
  const { data: milestones, isLoading: milestonesLoading } = useClientSyncMilestones();
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(user?.id);
  const { data: projectProgress, mutate: mutateProgress } = useProjectProgress(user?.id);
  const { data: allNotes } = useAllTopicNotes(user?.id);
  const { data: roadmap } = useRoadmap();
  const linkRegistry = useLinkRegistry();
  const { data: settings, mutate: mutateSettings } = useUserSettings(user?.id);

  const [activeMilestone, setActiveMilestone] = useState<ClientSyncMilestone | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [screenshotDraft, setScreenshotDraft] = useState("");

  async function handleTogglePin(milestone: ClientSyncMilestone) {
    if (!user) return;
    try {
      if (isPinned(settings?.pinned_items, "clientsync_milestone", milestone.id)) {
        await unpinItem(user.id, "clientsync_milestone", milestone.id);
        toast.success("Unpinned");
      } else {
        await pinItem(user.id, {
          type: "clientsync_milestone",
          id: milestone.id,
          label: milestone.description,
        });
        toast.success("Pinned to Workspace");
      }
      await mutateSettings();
    } catch {
      toast.error("Couldn't update pin. Try again.");
    }
  }

  const typedMilestones = (milestones ?? []) as ClientSyncMilestone[];
  const projectMap = new Map((projectProgress ?? []).map((p) => [p.phase_id, p]));

  const isPhaseComplete = (phaseId: string | null) => {
    const phase = phases.find((p) => p.id === phaseId);
    return !!phase && phase.topics.length > 0 && phase.topics.every((t) => t.progress?.completed);
  };

  // Item 7 — per-phase completion %, not just the all-or-nothing boolean
  // above. isPhaseComplete stays as-is (it drives the timeline dot/badge),
  // this adds the granular number the field-list asks for.
  const phaseCompletionPct = (phaseId: string | null) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase || phase.topics.length === 0) return 0;
    const done = phase.topics.filter((t) => t.progress?.completed).length;
    return Math.round((done / phase.topics.length) * 100);
  };

  const completedMilestones = typedMilestones.filter((m) => isPhaseComplete(m.linked_phase)).length;

  async function handleSave(phaseId: string, field: string, patch: Record<string, unknown>) {
    if (!user) return;
    setSavingField(field);
    try {
      await upsertProjectProgress(user.id, phaseId, patch);
      await mutateProgress();
    } catch {
      toast.error("Couldn't save.");
    } finally {
      setSavingField(null);
    }
  }

  function addScreenshot(phaseId: string, current: string[]) {
    const url = screenshotDraft.trim();
    if (!url) return;
    handleSave(phaseId, "screenshots", { screenshots: [...current, url] });
    setScreenshotDraft("");
  }

  function removeScreenshot(phaseId: string, current: string[], index: number) {
    const next = current.filter((_, i) => i !== index);
    handleSave(phaseId, "screenshots", { screenshots: next });
  }

  if (milestonesLoading || phasesLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const activeProgress = activeMilestone?.linked_phase
    ? projectMap.get(activeMilestone.linked_phase)
    : undefined;
  const activePhase = activeMilestone
    ? phases.find((p) => p.id === activeMilestone.linked_phase)
    : undefined;
  const activeStatus = activeProgress?.status ?? "not_started";
  const activeScreenshots = activeProgress?.screenshots ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">ClientSync</h1>
        <p className="text-sm text-muted mt-1">
          {completedMilestones}/{typedMilestones.length} milestones complete — the B2B onboarding SaaS
          anchor project, tracked independently of the phase roadmap.
        </p>
      </div>

      <div className="relative flex flex-col gap-3">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
        {typedMilestones.map((milestone) => {
          const complete = isPhaseComplete(milestone.linked_phase);
          const phase = phases.find((p) => p.id === milestone.linked_phase);
          const progress = milestone.linked_phase ? projectMap.get(milestone.linked_phase) : undefined;
          const status = progress?.status ?? "not_started";
          const shotCount = progress?.screenshots?.length ?? 0;

          return (
            <div key={milestone.id} className="relative flex gap-4">
              <div
                className={cn(
                  "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                  complete
                    ? "border-success bg-success/15 text-success"
                    : "border-border bg-surface text-muted"
                )}
              >
                {complete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-4 w-4" />}
              </div>
              <Card
                className="flex-1 cursor-pointer transition-standard hover:border-accent/40"
                onClick={() => setActiveMilestone(milestone)}
              >
                <CardContent noHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    {phase && (
                      <Badge variant="outline" className="font-mono-tabular">
                        Phase {phase.phase_number}
                      </Badge>
                    )}
                    <Badge variant={complete ? "success" : "outline"}>
                      {complete ? "Complete" : "Pending"}
                    </Badge>
                    {progress && (
                      <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                    )}
                  </div>
                  <p className="text-sm mt-2">{milestone.description}</p>
                  {phase && (
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={phaseCompletionPct(milestone.linked_phase)} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted font-mono-tabular shrink-0">
                        {phaseCompletionPct(milestone.linked_phase)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    {phase && (
                      <Link
                        href={`/roadmap#${phase.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-accent hover:underline flex items-center gap-1 w-fit"
                      >
                        View phase in roadmap <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                    {progress?.github_url && (
                      <a
                        href={progress.github_url}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent hover:underline flex items-center gap-1 text-xs"
                      >
                        <GitBranch className="h-3 w-3" /> Repo
                      </a>
                    )}
                    {progress?.deployment_url && (
                      <a
                        href={progress.deployment_url}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent hover:underline flex items-center gap-1 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" /> Live
                      </a>
                    )}
                    {progress?.demo_url && (
                      <a
                        href={progress.demo_url}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-accent hover:underline flex items-center gap-1 text-xs"
                      >
                        <Play className="h-3 w-3" /> Demo
                      </a>
                    )}
                    {shotCount > 0 && (
                      <span className="text-xs text-muted flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> {shotCount} screenshot{shotCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
        {typedMilestones.length === 0 && (
          <EmptyState message="No milestones yet." />
        )}
      </div>

      <Dialog open={!!activeMilestone} onOpenChange={(open) => !open && setActiveMilestone(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {activeMilestone && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {activePhase && (
                    <Badge variant="outline" className="font-mono-tabular">
                      Phase {activePhase.phase_number}
                    </Badge>
                  )}
                  {activePhase?.title ?? "ClientSync milestone"}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto"
                    onClick={() => handleTogglePin(activeMilestone)}
                    title={
                      isPinned(settings?.pinned_items, "clientsync_milestone", activeMilestone.id)
                        ? "Unpin from Workspace"
                        : "Pin to Workspace"
                    }
                  >
                    {isPinned(settings?.pinned_items, "clientsync_milestone", activeMilestone.id) ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </DialogTitle>
                <DialogDescription>{activeMilestone.description}</DialogDescription>
              </DialogHeader>

              {!activeMilestone.linked_phase ? (
                <p className="text-sm text-muted">
                  This milestone isn&apos;t linked to a phase, so progress can&apos;t be tracked here.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Progress value={phaseCompletionPct(activeMilestone.linked_phase)} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted font-mono-tabular shrink-0">
                      {phaseCompletionPct(activeMilestone.linked_phase)}% of phase topics complete
                    </span>
                  </div>
                  <Select
                    value={activeStatus}
                    onValueChange={(v) =>
                      handleSave(activeMilestone.linked_phase!, "status", { status: v as ProjectStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not started</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted shrink-0" />
                    <Input
                      placeholder="Repository URL"
                      defaultValue={activeProgress?.github_url ?? ""}
                      onBlur={(e) =>
                        handleSave(activeMilestone.linked_phase!, "github_url", {
                          github_url: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted shrink-0" />
                    <Input
                      placeholder="Deployment URL"
                      defaultValue={activeProgress?.deployment_url ?? ""}
                      onBlur={(e) =>
                        handleSave(activeMilestone.linked_phase!, "deployment_url", {
                          deployment_url: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-muted shrink-0" />
                    <Input
                      placeholder="Demo / video URL"
                      defaultValue={activeProgress?.demo_url ?? ""}
                      onBlur={(e) =>
                        handleSave(activeMilestone.linked_phase!, "demo_url", {
                          demo_url: e.target.value || null,
                        })
                      }
                    />
                  </div>

                  <Textarea
                    placeholder="Notes"
                    defaultValue={activeProgress?.notes ?? ""}
                    rows={2}
                    onBlur={(e) =>
                      handleSave(activeMilestone.linked_phase!, "notes", {
                        notes: e.target.value || null,
                      })
                    }
                  />

                  <ReferencedInPanel
                    backlinks={
                      allNotes && roadmap
                        ? computeBacklinks(
                            {
                              type: "clientsync_milestone",
                              id: activeMilestone.id,
                              label: activeMilestone.description,
                            },
                            allNotes,
                            roadmap.topics,
                            linkRegistry
                          )
                        : []
                    }
                  />

                  <div className="flex flex-col gap-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" /> Screenshots
                      {savingField === "screenshots" && <Loader2 className="h-3 w-3 animate-spin" />}
                    </p>
                    {activeScreenshots.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {activeScreenshots.map((url, i) => (
                          <div key={i} className="relative group aspect-video rounded-md overflow-hidden border border-border bg-surface-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`ClientSync screenshot ${i + 1}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <button
                              onClick={() =>
                                removeScreenshot(activeMilestone.linked_phase!, activeScreenshots, i)
                              }
                              className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-background/80 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Remove screenshot"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Screenshot URL"
                        value={screenshotDraft}
                        onChange={(e) => setScreenshotDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addScreenshot(activeMilestone.linked_phase!, activeScreenshots);
                          }
                        }}
                      />
                      <button
                        onClick={() => addScreenshot(activeMilestone.linked_phase!, activeScreenshots)}
                        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-surface-2 transition-standard"
                        aria-label="Add screenshot"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
