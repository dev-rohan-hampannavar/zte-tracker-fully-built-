"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { DetailedRoadmapModule, DetailedRoadmapPhase, DetailedRoadmapProject, DetailedRoadmapTopic, Roadmap, RoadmapVersion } from "@/types/database";
import { normalizeHttpUrl } from "@/lib/validate-url";

const client = createClient();
const toLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
const contentId = (prefix: string, title: string) => `${prefix}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "new"}-${crypto.randomUUID().slice(0, 8)}`;
const parseResources = (value: string) => value.split("\n").map((line) => {
  const [label, type, url] = line.split("|").map((part) => part.trim());
  const safeUrl = normalizeHttpUrl(url);
  return label && safeUrl ? { label, type: type || "documentation", url: safeUrl } : null;
}).filter((item): item is { label: string; type: string; url: string } => Boolean(item));

export function DetailedCurriculumEditor() {
  const { data: roadmaps, isLoading: roadmapsLoading } = useSWR("admin-detailed-roadmaps", async () => {
    const { data, error } = await client.from("roadmaps").select("*").neq("id", "zte-core-v1").order("title");
    if (error) throw error;
    return (data ?? []) as Roadmap[];
  });
  const [roadmapIdDraft, setRoadmapIdDraft] = useState("");
  const roadmapId = roadmapIdDraft || roadmaps?.[0]?.id || "";
  const { data: versions, mutate: mutateVersions } = useSWR(roadmapId ? ["admin-roadmap-versions", roadmapId] : null, async () => {
    const { data, error } = await client.from("roadmap_versions").select("*").eq("roadmap_id", roadmapId).order("version_number", { ascending: false });
    if (error) throw error;
    return (data ?? []) as RoadmapVersion[];
  });
  const [versionIdDraft, setVersionIdDraft] = useState("");
  const version = versions?.find((row) => row.id === versionIdDraft) ?? versions?.find((row) => row.is_current) ?? versions?.[0];
  const versionId = version?.id ?? "";
  const isEditable = version?.status === "draft";
  const { data: phases, mutate: mutatePhases } = useSWR(versionId ? ["admin-roadmap-phases", roadmapId, versionId] : null, async () => {
    const { data, error } = await client.from("roadmap_phases").select("*").eq("roadmap_id", roadmapId).eq("roadmap_version_id", versionId).order("order_index");
    if (error) throw error;
    return (data ?? []) as DetailedRoadmapPhase[];
  });
  const [phaseIdDraft, setPhaseIdDraft] = useState("");
  const phase = phases?.find((row) => row.id === phaseIdDraft) ?? phases?.[0];
  const phaseId = phase?.id ?? "";
  const { data: modules, mutate: mutateModules } = useSWR(phaseId ? ["admin-roadmap-modules", phaseId] : null, async () => {
    const { data, error } = await client.from("roadmap_modules").select("*").eq("phase_id", phaseId).order("order_index");
    if (error) throw error;
    return (data ?? []) as DetailedRoadmapModule[];
  });
  const moduleIds = useMemo(() => modules?.map((row) => row.id) ?? [], [modules]);
  const { data: topics, mutate: mutateTopics } = useSWR(moduleIds.length ? ["admin-roadmap-topics", ...moduleIds] : null, async () => {
    const { data, error } = await client.from("roadmap_topics").select("*").in("module_id", moduleIds).order("order_index");
    if (error) throw error;
    return (data ?? []) as DetailedRoadmapTopic[];
  });
  const { data: projects, mutate: mutateProjects } = useSWR(phaseId ? ["admin-roadmap-projects", phaseId] : null, async () => {
    const { data, error } = await client.from("roadmap_projects").select("*").eq("phase_id", phaseId).order("order_index");
    if (error) throw error;
    return (data ?? []) as DetailedRoadmapProject[];
  });
  const [moduleIdDraft, setModuleIdDraft] = useState("");
  const selectedModule = modules?.find((row) => row.id === moduleIdDraft) ?? modules?.[0];
  const moduleId = selectedModule?.id ?? "";
  const visibleTopics = (topics ?? []).filter((row) => row.module_id === moduleId);
  const [topicIdDraft, setTopicIdDraft] = useState("");
  const topic = visibleTopics.find((row) => row.id === topicIdDraft) ?? visibleTopics[0];
  const [projectIdDraft, setProjectIdDraft] = useState("");
  const project = projects?.find((row) => row.id === projectIdDraft) ?? projects?.[0];
  const [phaseDrafts, setPhaseDrafts] = useState<Record<string, { title: string; description: string; estimated_hours: string; band: DetailedRoadmapPhase["band"] }>>({});
  const [moduleDrafts, setModuleDrafts] = useState<Record<string, { title: string; description: string; estimated_hours: string }>>({});
  const [topicDrafts, setTopicDrafts] = useState<Record<string, { title: string; objectives: string; practice: string; evidence: string; prerequisites: string; resources: string; minutes: string; difficulty: DetailedRoadmapTopic["difficulty"] }>>({});
  const [projectDrafts, setProjectDrafts] = useState<Record<string, { title: string; problem: string; requirements: string; milestones: string; deliverables: string; skills: string; difficulty: DetailedRoadmapProject["difficulty"] }>>({});
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const currentPhaseDraft = phase && (phaseDrafts[phase.id] ?? { title: phase.title, description: phase.description, estimated_hours: String(phase.estimated_hours), band: phase.band });
  const currentModuleDraft = selectedModule && (moduleDrafts[selectedModule.id] ?? { title: selectedModule.title, description: selectedModule.description, estimated_hours: String(selectedModule.estimated_hours) });
  const currentTopicDraft = topic && (topicDrafts[topic.id] ?? {
    title: topic.title,
    objectives: topic.learning_objectives.join("\n"),
    practice: topic.practice_tasks.join("\n"),
    evidence: topic.completion_evidence.join("\n"),
    prerequisites: topic.prerequisite_topic_ids.join("\n"),
    resources: topic.learning_resources.map((resource) => `${resource.label} | ${resource.type ?? "documentation"} | ${resource.url}`).join("\n"),
    minutes: String(topic.estimated_minutes),
    difficulty: topic.difficulty,
  });
  const currentProjectDraft = project && (projectDrafts[project.id] ?? {
    title: project.title,
    problem: project.problem_statement,
    requirements: project.requirements.join("\n"),
    milestones: project.milestones.join("\n"),
    deliverables: project.deliverables.join("\n"),
    skills: project.skills.join("\n"),
    difficulty: project.difficulty,
  });

  async function createDraftVersion() {
    if (!roadmapId) return;
    setSaving("new-version");
    try {
      const { data, error } = await client.rpc("create_roadmap_draft" as never, { p_roadmap_id: roadmapId } as never);
      if (error) throw error;
      const draftId = data as unknown as string;
      await mutateVersions();
      setVersionIdDraft(draftId);
      setPhaseIdDraft("");
      setModuleIdDraft("");
      setTopicIdDraft("");
      setProjectIdDraft("");
      toast.success("Draft copied from the current published version");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create a draft version");
    } finally { setSaving(null); }
  }

  async function advanceVersionStatus() {
    if (!version) return;
    const nextStatus = version.status === "draft" ? "review" : version.status === "review" ? "test" : version.status === "test" ? "published" : null;
    if (!nextStatus) return;
    setSaving(version.id);
    try {
      const { error } = await client.rpc("set_roadmap_version_status" as never, {
        p_roadmap_version_id: version.id,
        p_status: nextStatus,
      } as never);
      if (error) throw error;
      await Promise.all([mutateVersions(), mutatePhases()]);
      toast.success(nextStatus === "published" ? "Version published as the current roadmap" : `Version moved to ${nextStatus}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update version status");
    } finally { setSaving(null); }
  }

  async function savePhase() {
    if (!phase || !currentPhaseDraft || !isEditable) return;
    setSaving(phase.id);
    try {
      const { error } = await client.from("roadmap_phases").update({ title: currentPhaseDraft.title, description: currentPhaseDraft.description, band: currentPhaseDraft.band, estimated_hours: Math.max(1, Number(currentPhaseDraft.estimated_hours) || 1) } as never).eq("id", phase.id);
      if (error) throw error;
      await mutatePhases();
      toast.success("Draft phase saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save phase");
    } finally { setSaving(null); }
  }

  async function createPhase() {
    const title = newPhaseTitle.trim();
    if (!versionId || !isEditable || !title) return;
    setSaving("new-phase");
    const nextNumber = Math.max(0, ...(phases ?? []).map((row) => Number.parseInt(row.phase_number, 10) || 0)) + 1;
    const id = contentId("phase", title);
    try {
      const { error } = await client.from("roadmap_phases").insert({
        id, roadmap_id: roadmapId, roadmap_version_id: versionId,
        phase_number: String(nextNumber).padStart(2, "0"), title, band: "Foundation",
        description: "Add a phase description", estimated_hours: 1,
        order_index: Math.max(-1, ...(phases ?? []).map((row) => row.order_index)) + 1,
      } as never);
      if (error) throw error;
      setNewPhaseTitle("");
      await mutatePhases();
      setPhaseIdDraft(id);
      toast.success("Draft phase added. Fill in its full description and hours.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add phase"); }
    finally { setSaving(null); }
  }

  async function createModule() {
    const title = newModuleTitle.trim();
    if (!phase || !isEditable || !title) return;
    setSaving("new-module");
    const id = contentId("module", title);
    try {
      const { error } = await client.from("roadmap_modules").insert({
        id, phase_id: phase.id,
        module_number: Math.max(0, ...(modules ?? []).map((row) => row.module_number)) + 1,
        title, description: "Add a module description", estimated_hours: 1,
        order_index: Math.max(-1, ...(modules ?? []).map((row) => row.order_index)) + 1,
      } as never);
      if (error) throw error;
      setNewModuleTitle("");
      await mutateModules();
      setModuleIdDraft(id);
      toast.success("Draft module added. Fill in its full description and hours.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add module"); }
    finally { setSaving(null); }
  }

  async function saveModule() {
    if (!selectedModule || !currentModuleDraft || !isEditable) return;
    setSaving(selectedModule.id);
    try {
      const { error } = await client.from("roadmap_modules").update({
        title: currentModuleDraft.title, description: currentModuleDraft.description,
        estimated_hours: Math.max(1, Number(currentModuleDraft.estimated_hours) || 1),
      } as never).eq("id", selectedModule.id);
      if (error) throw error;
      await mutateModules();
      toast.success("Draft module saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save module"); }
    finally { setSaving(null); }
  }

  async function createTopic() {
    const title = newTopicTitle.trim();
    if (!selectedModule || !isEditable || !title) return;
    setSaving("new-topic");
    const id = contentId("topic", title);
    try {
      const { error } = await client.from("roadmap_topics").insert({
        id, module_id: selectedModule.id, title,
        learning_objectives: [], practice_tasks: [], completion_evidence: [],
        prerequisite_topic_ids: [], learning_resources: [], estimated_minutes: 30,
        difficulty: "beginner", order_index: Math.max(-1, ...visibleTopics.map((row) => row.order_index)) + 1,
      } as never);
      if (error) throw error;
      setNewTopicTitle("");
      await mutateTopics();
      setTopicIdDraft(id);
      toast.success("Draft topic added. Add objectives, practice, evidence, and resources.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add topic"); }
    finally { setSaving(null); }
  }

  async function createProject() {
    const title = newProjectTitle.trim();
    if (!phase || !isEditable || !title) return;
    setSaving("new-project");
    const id = contentId("project", title);
    try {
      const { error } = await client.from("roadmap_projects").insert({
        id, phase_id: phase.id, title,
        problem_statement: "Describe the problem this project solves", requirements: [],
        milestones: [], deliverables: [], skills: [], difficulty: "beginner",
        order_index: Math.max(-1, ...(projects ?? []).map((row) => row.order_index)) + 1,
      } as never);
      if (error) throw error;
      setNewProjectTitle("");
      await mutateProjects();
      toast.success("Draft project added. Fill in requirements, milestones, deliverables, and skills.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add project"); }
    finally { setSaving(null); }
  }

  async function saveTopic() {
    if (!topic || !currentTopicDraft || !isEditable) return;
    setSaving(topic.id);
    try {
      const { error } = await client.from("roadmap_topics").update({
        title: currentTopicDraft.title,
        learning_objectives: toLines(currentTopicDraft.objectives),
        practice_tasks: toLines(currentTopicDraft.practice),
        completion_evidence: toLines(currentTopicDraft.evidence),
        prerequisite_topic_ids: toLines(currentTopicDraft.prerequisites),
        learning_resources: parseResources(currentTopicDraft.resources),
        estimated_minutes: Math.max(1, Number(currentTopicDraft.minutes) || 1),
        difficulty: currentTopicDraft.difficulty,
      } as never).eq("id", topic.id);
      if (error) throw error;
      await mutateTopics();
      toast.success("Draft topic saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save topic");
    } finally { setSaving(null); }
  }

  async function saveProject() {
    if (!project || !currentProjectDraft || !isEditable) return;
    setSaving(project.id);
    try {
      const { error } = await client.from("roadmap_projects").update({
        title: currentProjectDraft.title,
        problem_statement: currentProjectDraft.problem,
        requirements: toLines(currentProjectDraft.requirements),
        milestones: toLines(currentProjectDraft.milestones),
        deliverables: toLines(currentProjectDraft.deliverables),
        skills: toLines(currentProjectDraft.skills),
        difficulty: currentProjectDraft.difficulty,
      } as never).eq("id", project.id);
      if (error) throw error;
      await mutateProjects();
      toast.success("Draft project saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save project");
    } finally { setSaving(null); }
  }

  if (roadmapsLoading) return <Card><CardContent className="p-5"><Loader2 className="size-4 animate-spin" /></CardContent></Card>;

  return <Card className="mb-8">
    <CardHeader>
      <CardTitle>Versioned learning tracks</CardTitle>
      <p className="text-sm text-muted-foreground">Create a draft from the current curriculum, edit it safely, then move it through review, test, and publish. Published versions cannot be edited directly.</p>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <Select value={roadmapId} onValueChange={(value) => { setRoadmapIdDraft(value); setVersionIdDraft(""); setPhaseIdDraft(""); setModuleIdDraft(""); setTopicIdDraft(""); setProjectIdDraft(""); }}>
          <SelectTrigger aria-label="Select roadmap"><SelectValue placeholder="Select roadmap" /></SelectTrigger>
          <SelectContent>{(roadmaps ?? []).map((row) => <SelectItem key={row.id} value={row.id}>{row.title}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={versionId} onValueChange={(value) => { setVersionIdDraft(value); setPhaseIdDraft(""); setModuleIdDraft(""); setTopicIdDraft(""); setProjectIdDraft(""); }}>
          <SelectTrigger aria-label="Select roadmap version"><SelectValue placeholder="Select version" /></SelectTrigger>
          <SelectContent>{(versions ?? []).map((row) => <SelectItem key={row.id} value={row.id}>v{row.version_number} · {row.status}{row.is_current ? " · current" : ""}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => void createDraftVersion()} disabled={!version?.is_current || saving !== null}>
          {saving === "new-version" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}Create draft from current
        </Button>
        {version && version.status !== "published" && <Button size="sm" onClick={() => void advanceVersionStatus()} disabled={saving !== null}>
          {saving === version.id ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
          {version.status === "draft" ? "Send to review" : version.status === "review" ? "Start test" : "Publish as current"}
        </Button>}
        {version && <Badge variant={version.is_current ? "default" : "outline"}>{version.status}{version.is_current ? " · current" : ""}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">Learners keep their enrolled published version. Publishing switches new enrollments to the released version.</p>

      <div className="flex flex-wrap gap-2">
        <Input disabled={!isEditable} value={newPhaseTitle} onChange={(event) => setNewPhaseTitle(event.target.value)} placeholder="New phase title" aria-label="New phase title" />
        <Button size="sm" variant="outline" disabled={!isEditable || !newPhaseTitle.trim() || saving !== null} onClick={() => void createPhase()}>{saving === "new-phase" ? "Adding…" : "Add phase"}</Button>
      </div>
      {!phases?.length ? <p className="text-sm text-muted-foreground">No detailed curriculum phases are available for this version yet.</p> : <>
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={phase?.id ?? ""} onValueChange={(value) => { setPhaseIdDraft(value); setModuleIdDraft(""); setTopicIdDraft(""); setProjectIdDraft(""); }}><SelectTrigger aria-label="Select phase"><SelectValue placeholder="Select phase" /></SelectTrigger><SelectContent>{(phases ?? []).map((row) => <SelectItem key={row.id} value={row.id}>{row.phase_number} · {row.title}</SelectItem>)}</SelectContent></Select>
          <Select value={selectedModule?.id ?? ""} onValueChange={(value) => { setModuleIdDraft(value); setTopicIdDraft(""); }} disabled={!modules?.length}><SelectTrigger aria-label="Select module"><SelectValue placeholder="Select module" /></SelectTrigger><SelectContent>{(modules ?? []).map((row) => <SelectItem key={row.id} value={row.id}>{row.module_number} · {row.title}</SelectItem>)}</SelectContent></Select>
          <Select value={topic?.id ?? ""} onValueChange={setTopicIdDraft} disabled={!visibleTopics.length}><SelectTrigger aria-label="Select topic"><SelectValue placeholder="Select topic" /></SelectTrigger><SelectContent>{visibleTopics.map((row) => <SelectItem key={row.id} value={row.id}>{row.title}</SelectItem>)}</SelectContent></Select>
          <Select value={project?.id ?? ""} onValueChange={setProjectIdDraft} disabled={!projects?.length}><SelectTrigger aria-label="Select applied project"><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{(projects ?? []).map((row) => <SelectItem key={row.id} value={row.id}>{row.title}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex gap-2"><Input disabled={!isEditable || !phase} value={newModuleTitle} onChange={(event) => setNewModuleTitle(event.target.value)} placeholder="New module title" aria-label="New module title" /><Button size="sm" variant="outline" disabled={!isEditable || !phase || !newModuleTitle.trim() || saving !== null} onClick={() => void createModule()}>Add module</Button></div>
          <div className="flex gap-2"><Input disabled={!isEditable || !selectedModule} value={newTopicTitle} onChange={(event) => setNewTopicTitle(event.target.value)} placeholder="New topic title" aria-label="New topic title" /><Button size="sm" variant="outline" disabled={!isEditable || !selectedModule || !newTopicTitle.trim() || saving !== null} onClick={() => void createTopic()}>Add topic</Button></div>
          <div className="flex gap-2"><Input disabled={!isEditable || !phase} value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} placeholder="New project title" aria-label="New project title" /><Button size="sm" variant="outline" disabled={!isEditable || !phase || !newProjectTitle.trim() || saving !== null} onClick={() => void createProject()}>Add project</Button></div>
        </div>
        {phase && currentPhaseDraft && <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3"><div><Badge variant="outline">Phase {phase.phase_number} · {phase.band}</Badge><h3 className="mt-2 font-medium">{isEditable ? "Edit phase" : "Published phase (read-only)"}</h3></div><Button size="sm" onClick={() => void savePhase()} disabled={!isEditable || saving === phase.id}><Save className="mr-2 size-3.5" />Save</Button></div>
          <Input disabled={!isEditable} value={currentPhaseDraft.title} onChange={(event) => setPhaseDrafts((drafts) => ({ ...drafts, [phase.id]: { ...currentPhaseDraft, title: event.target.value } }))} aria-label="Phase title" />
          <Textarea disabled={!isEditable} value={currentPhaseDraft.description} onChange={(event) => setPhaseDrafts((drafts) => ({ ...drafts, [phase.id]: { ...currentPhaseDraft, description: event.target.value } }))} aria-label="Phase description" />
          <Select disabled={!isEditable} value={currentPhaseDraft.band} onValueChange={(value) => setPhaseDrafts((drafts) => ({ ...drafts, [phase.id]: { ...currentPhaseDraft, band: value as DetailedRoadmapPhase["band"] } }))}><SelectTrigger aria-label="Phase band"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Foundation">Foundation</SelectItem><SelectItem value="Core">Core</SelectItem><SelectItem value="Advanced">Advanced</SelectItem><SelectItem value="Expert">Expert</SelectItem></SelectContent></Select>
          <Input disabled={!isEditable} type="number" min="1" value={currentPhaseDraft.estimated_hours} onChange={(event) => setPhaseDrafts((drafts) => ({ ...drafts, [phase.id]: { ...currentPhaseDraft, estimated_hours: event.target.value } }))} aria-label="Estimated phase hours" />
        </section>}
        {selectedModule && currentModuleDraft && <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3"><div><Badge variant="outline">Module {selectedModule.module_number}</Badge><h3 className="mt-2 font-medium">{isEditable ? "Edit module" : "Published module (read-only)"}</h3></div><Button size="sm" onClick={() => void saveModule()} disabled={!isEditable || saving === selectedModule.id}><Save className="mr-2 size-3.5" />Save</Button></div>
          <Input disabled={!isEditable} value={currentModuleDraft.title} onChange={(event) => setModuleDrafts((drafts) => ({ ...drafts, [selectedModule.id]: { ...currentModuleDraft, title: event.target.value } }))} aria-label="Module title" />
          <Textarea disabled={!isEditable} value={currentModuleDraft.description} onChange={(event) => setModuleDrafts((drafts) => ({ ...drafts, [selectedModule.id]: { ...currentModuleDraft, description: event.target.value } }))} aria-label="Module description" />
          <Input disabled={!isEditable} type="number" min="1" value={currentModuleDraft.estimated_hours} onChange={(event) => setModuleDrafts((drafts) => ({ ...drafts, [selectedModule.id]: { ...currentModuleDraft, estimated_hours: event.target.value } }))} aria-label="Estimated module hours" />
        </section>}
        {topic && currentTopicDraft && <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3"><div><Badge variant="outline">{topic.difficulty} · {topic.estimated_minutes} min</Badge><h3 className="mt-2 font-medium">{isEditable ? "Edit learning topic" : "Published topic (read-only)"}</h3></div><Button size="sm" onClick={() => void saveTopic()} disabled={!isEditable || saving === topic.id}><Save className="mr-2 size-3.5" />Save</Button></div>
          <Input disabled={!isEditable} value={currentTopicDraft.title} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, title: event.target.value } }))} aria-label="Topic title" />
          <div className="grid gap-3 md:grid-cols-3"><Textarea disabled={!isEditable} value={currentTopicDraft.objectives} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, objectives: event.target.value } }))} aria-label="Learning objectives, one per line" placeholder="Objectives, one per line" /><Textarea disabled={!isEditable} value={currentTopicDraft.practice} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, practice: event.target.value } }))} aria-label="Practice tasks, one per line" placeholder="Practice tasks, one per line" /><Textarea disabled={!isEditable} value={currentTopicDraft.evidence} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, evidence: event.target.value } }))} aria-label="Completion evidence, one per line" placeholder="Evidence, one per line" /></div>
          <div className="grid gap-3 md:grid-cols-3"><Textarea disabled={!isEditable} value={currentTopicDraft.prerequisites} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, prerequisites: event.target.value } }))} aria-label="Prerequisite topic IDs, one per line" placeholder="Prerequisite topic IDs, one per line" /><Textarea disabled={!isEditable} value={currentTopicDraft.resources} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, resources: event.target.value } }))} aria-label="Resources, one per line as label | type | URL" placeholder="label | type | https://url (one per line)" /><Select disabled={!isEditable} value={currentTopicDraft.difficulty} onValueChange={(value) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, difficulty: value as DetailedRoadmapTopic["difficulty"] } }))}><SelectTrigger aria-label="Topic difficulty"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent></Select></div>
          <Input disabled={!isEditable} type="number" min="1" value={currentTopicDraft.minutes} onChange={(event) => setTopicDrafts((drafts) => ({ ...drafts, [topic.id]: { ...currentTopicDraft, minutes: event.target.value } }))} aria-label="Estimated topic minutes" />
        </section>}
        {project && currentProjectDraft && <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3"><div><Badge variant="outline">Applied project · {project.difficulty}</Badge><h3 className="mt-2 font-medium">{isEditable ? "Edit project brief" : "Published project (read-only)"}</h3></div><Button size="sm" onClick={() => void saveProject()} disabled={!isEditable || saving === project.id}><Save className="mr-2 size-3.5" />Save</Button></div>
          <Input disabled={!isEditable} value={currentProjectDraft.title} onChange={(event) => setProjectDrafts((drafts) => ({ ...drafts, [project.id]: { ...currentProjectDraft, title: event.target.value } }))} aria-label="Project title" />
          <Textarea disabled={!isEditable} value={currentProjectDraft.problem} onChange={(event) => setProjectDrafts((drafts) => ({ ...drafts, [project.id]: { ...currentProjectDraft, problem: event.target.value } }))} aria-label="Project problem statement" />
          <div className="grid gap-3 md:grid-cols-3"><Textarea disabled={!isEditable} value={currentProjectDraft.requirements} onChange={(event) => setProjectDrafts((drafts) => ({ ...drafts, [project.id]: { ...currentProjectDraft, requirements: event.target.value } }))} aria-label="Project requirements, one per line" placeholder="Requirements, one per line" /><Textarea disabled={!isEditable} value={currentProjectDraft.milestones} onChange={(event) => setProjectDrafts((drafts) => ({ ...drafts, [project.id]: { ...currentProjectDraft, milestones: event.target.value } }))} aria-label="Project milestones, one per line" placeholder="Milestones, one per line" /><Textarea disabled={!isEditable} value={currentProjectDraft.deliverables} onChange={(event) => setProjectDrafts((drafts) => ({ ...drafts, [project.id]: { ...currentProjectDraft, deliverables: event.target.value } }))} aria-label="Project deliverables, one per line" placeholder="Deliverables, one per line" /></div>
          <div className="grid gap-3 md:grid-cols-2"><Textarea disabled={!isEditable} value={currentProjectDraft.skills} onChange={(event) => setProjectDrafts((drafts) => ({ ...drafts, [project.id]: { ...currentProjectDraft, skills: event.target.value } }))} aria-label="Project skills, one per line" placeholder="Skills demonstrated, one per line" /><Select disabled={!isEditable} value={currentProjectDraft.difficulty} onValueChange={(value) => setProjectDrafts((drafts) => ({ ...drafts, [project.id]: { ...currentProjectDraft, difficulty: value as DetailedRoadmapProject["difficulty"] } }))}><SelectTrigger aria-label="Project difficulty"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent></Select></div>
        </section>}
      </>}
    </CardContent>
  </Card>;
}
