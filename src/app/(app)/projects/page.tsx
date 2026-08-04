"use client";

import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress, useTechnologies, useAllTopicNotes, useLinkRegistry, useRoadmap } from "@/lib/hooks/use-roadmap";
import { useProjectProgress, upsertProjectProgress } from "@/lib/hooks/use-projects";
import { matchTechnologiesInText } from "@/lib/project-dependencies";
import { computeBacklinks } from "@/lib/note-links";
import { ReferencedInPanel } from "@/components/roadmap/referenced-in-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUserSettings, pinItem, unpinItem, isPinned } from "@/lib/hooks/use-user-settings";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, GitBranch, FolderGit2, Layers, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import type { ProjectStatus } from "@/types/database";

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

export default function ProjectsPage() {
  const { user } = useUser();
  const { phases: allPhases, isLoading: roadmapLoading } = usePhasesWithProgress(user?.id);
  const { data: projects, mutate } = useProjectProgress(user?.id);
  const { data: technologies } = useTechnologies();
  const { data: allNotes } = useAllTopicNotes(user?.id);
  const { data: roadmap } = useRoadmap();
  const linkRegistry = useLinkRegistry();
  const { data: settings, mutate: mutateSettings } = useUserSettings(user?.id);

  const projectMap = new Map((projects ?? []).map((p) => [p.phase_id, p]));
  const phases = allPhases.filter((p) => p.estimated_hours && p.estimated_hours > 0);

  async function handleTogglePin(phaseId: string, phaseTitle: string) {
    if (!user) return;
    try {
      if (isPinned(settings?.pinned_items, "project", phaseId)) {
        await unpinItem(user.id, "project", phaseId);
        toast.success("Unpinned");
      } else {
        await pinItem(user.id, { type: "project", id: phaseId, label: phaseTitle });
        toast.success("Pinned to Workspace");
      }
      await mutateSettings();
    } catch {
      toast.error("Couldn't update pin. Try again.");
    }
  }

  const stageProjectPhases = allPhases.filter((p) => (p.stages ?? []).some((s) => s.projects.length > 0));
  const totalStageProjects = stageProjectPhases.reduce(
    (sum, p) => sum + (p.stages ?? []).reduce((s, st) => s + st.projects.length, 0),
    0
  );

  // A stage project's real "requirements" are the topics taught in its own
  // stage (what it necessarily uses) plus every stage before it in the same
  // phase (foundation it builds on). Cross-phase depth is summarized as a
  // count rather than exploded into chips, since phase order (not stage
  // order) is what determines "everything before this phase" and listing
  // every prior topic individually would be noise, not signal.
  function stageDependencies(phase: (typeof allPhases)[number], stageId: string) {
    const stages = (phase.stages ?? []).slice().sort((a, b) => a.order_index - b.order_index);
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx === -1) return { sameStage: [], priorStages: [], priorPhaseCount: 0 };

    const sameStage = stages[idx].topics.map((t) => t.title);
    const priorStages = stages
      .slice(0, idx)
      .flatMap((s) => s.topics.map((t) => t.title));

    const phaseIdx = allPhases.findIndex((p) => p.id === phase.id);
    const priorPhaseCount = phaseIdx > 0 ? phaseIdx : 0;

    return { sameStage, priorStages, priorPhaseCount };
  }

  // A capstone/portfolio project's dependency is every phase before it —
  // real, derivable from order_index, not a fabricated tech list.
  function capstoneDependencies(phase: (typeof allPhases)[number]) {
    const phaseIdx = allPhases.findIndex((p) => p.id === phase.id);
    const priorPhases = allPhases.slice(0, phaseIdx).filter((p) => p.topics.length > 0);
    return priorPhases;
  }

  async function handleSave(phaseId: string, patch: Record<string, unknown>) {
    if (!user) return;
    try {
      await upsertProjectProgress(user.id, phaseId, patch);
      await mutate();
    } catch {
      toast.error("Couldn't save.");
    }
  }

  if (roadmapLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted">
          Stage-level build exercises, plus phase capstones like ClientSync and Trackify.
        </p>
      </div>

      <Tabs defaultValue="stage">
        <TabsList>
          <TabsTrigger value="stage">
            <Layers className="h-3.5 w-3.5 mr-1.5" /> Stage projects ({totalStageProjects})
          </TabsTrigger>
          <TabsTrigger value="portfolio">
            <FolderGit2 className="h-3.5 w-3.5 mr-1.5" /> Portfolio projects ({phases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stage" className="flex flex-col gap-6 mt-4">
          {stageProjectPhases.length === 0 && (
            <p className="text-sm text-muted">No stage-level projects found in the roadmap data.</p>
          )}
          {stageProjectPhases.map((phase) => (
            <div key={phase.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Phase {phase.phase_number} — {phase.title}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleTogglePin(phase.id, phase.title)}
                  title={isPinned(settings?.pinned_items, "project", phase.id) ? "Unpin from Workspace" : "Pin to Workspace"}
                >
                  {isPinned(settings?.pinned_items, "project", phase.id) ? (
                    <PinOff className="h-3.5 w-3.5" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(phase.stages ?? [])
                  .filter((s) => s.projects.length > 0)
                  .map((stage) => (
                    <Card key={stage.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Badge variant="outline" className="font-mono-tabular">
                            Stage {stage.stage_number}
                          </Badge>
                          {stage.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="flex flex-col gap-3">
                          {stage.projects.map((p) => {
                            const deps = stageDependencies(phase, stage.id);
                            const requires = Array.from(new Set(deps.sameStage));
                            const builtOn = Array.from(new Set(deps.priorStages));
                            const projectTech = matchTechnologiesInText(p.description, technologies ?? []);
                            return (
                              <li key={p.id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{p.name}</span>
                                  <Badge
                                    variant={
                                      p.difficulty === "hard"
                                        ? "danger"
                                        : p.difficulty === "medium"
                                        ? "warning"
                                        : "success"
                                    }
                                  >
                                    {p.difficulty}
                                  </Badge>
                                </div>
                                <p className="text-muted mt-0.5">{p.description}</p>
                                {projectTech.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    <span className="text-[10px] text-muted mr-0.5">Tech stack:</span>
                                    {projectTech.map((tech) => (
                                      <Badge
                                        key={tech.id}
                                        variant="accent"
                                        className="text-[10px] font-normal"
                                        title="Detected from the project description against the app's curated technology list"
                                      >
                                        {tech.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {(requires.length > 0 || builtOn.length > 0 || deps.priorPhaseCount > 0) && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    <span className="text-[10px] text-muted mr-0.5">Requires:</span>
                                    {requires.map((title) => (
                                      <Badge key={title} variant="outline" className="text-[10px] font-normal">
                                        {title}
                                      </Badge>
                                    ))}
                                    {builtOn.length > 0 && (
                                      <Badge variant="outline" className="text-[10px] font-normal text-muted">
                                        +{builtOn.length} from earlier stages
                                      </Badge>
                                    )}
                                    {deps.priorPhaseCount > 0 && (
                                      <Badge variant="outline" className="text-[10px] font-normal text-muted">
                                        builds on {deps.priorPhaseCount} earlier phase
                                        {deps.priorPhaseCount === 1 ? "" : "s"}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <ReferencedInPanel
                                  backlinks={
                                    allNotes && roadmap
                                      ? computeBacklinks(
                                          { type: "project", id: p.id, label: p.name },
                                          allNotes,
                                          roadmap.topics,
                                          linkRegistry
                                        )
                                      : []
                                  }
                                />
                              </li>
                            );
                          })}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {phases.map((phase) => {
          const p = projectMap.get(phase.id);
          const status = p?.status ?? "not_started";
          const priorPhases = capstoneDependencies(phase);
          const phaseTech = matchTechnologiesInText(
            `${phase.title} ${phase.description ?? ""}`,
            technologies ?? []
          );

          return (
            <Card key={phase.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Phase {phase.phase_number} — {phase.title}
                  </CardTitle>
                  <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                </div>
                <CardDescription>Capstone build for this phase</CardDescription>
                {phaseTech.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="text-[10px] text-muted mr-0.5 self-center">Tech stack:</span>
                    {phaseTech.map((tech) => (
                      <Badge
                        key={tech.id}
                        variant="accent"
                        className="text-[10px] font-normal"
                        title="Detected from the phase title/description against the app's curated technology list"
                      >
                        {tech.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {priorPhases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="text-[10px] text-muted mr-0.5 self-center">Requires:</span>
                    {priorPhases.slice(-3).map((pp) => (
                      <Badge key={pp.id} variant="outline" className="text-[10px] font-normal">
                        {pp.title}
                      </Badge>
                    ))}
                    {priorPhases.length > 3 && (
                      <Badge variant="outline" className="text-[10px] font-normal text-muted">
                        +{priorPhases.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Select
                  value={status}
                  onValueChange={(v) => handleSave(phase.id, { status: v as ProjectStatus })}
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
                    defaultValue={p?.github_url ?? ""}
                    onBlur={(e) => handleSave(phase.id, { github_url: e.target.value || null })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted shrink-0" />
                  <Input
                    placeholder="Deployment URL"
                    defaultValue={p?.deployment_url ?? ""}
                    onBlur={(e) => handleSave(phase.id, { deployment_url: e.target.value || null })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-muted shrink-0" />
                  <Input
                    placeholder="Demo / video URL"
                    defaultValue={p?.demo_url ?? ""}
                    onBlur={(e) => handleSave(phase.id, { demo_url: e.target.value || null })}
                  />
                </div>
                <Textarea
                  placeholder="Notes"
                  defaultValue={p?.notes ?? ""}
                  rows={2}
                  onBlur={(e) => handleSave(phase.id, { notes: e.target.value || null })}
                />

                <div className="flex gap-3 text-xs">
                  {p?.github_url && (
                    <a href={p.github_url} target="_blank" className="text-accent hover:underline flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> Repo
                    </a>
                  )}
                  {p?.deployment_url && (
                    <a href={p.deployment_url} target="_blank" className="text-accent hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Live
                    </a>
                  )}
                  {p?.demo_url && (
                    <a href={p.demo_url} target="_blank" className="text-accent hover:underline flex items-center gap-1">
                      <Play className="h-3 w-3" /> Demo
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
