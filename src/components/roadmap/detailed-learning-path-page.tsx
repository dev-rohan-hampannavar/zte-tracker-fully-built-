"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useActiveUserRoadmap } from "@/lib/hooks/use-user-roadmap";
import { saveDetailedRoadmapTopicNote, setDetailedRoadmapProjectProgress, setDetailedRoadmapTopicStatus, useDetailedRoadmap, useDetailedRoadmapTopicNotes } from "@/lib/hooks/use-roadmap";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BookOpen, BriefcaseBusiness, Check, Loader2 } from "lucide-react";
import type { DetailedRoadmapProject, UserRoadmapProjectProgress } from "@/types/database";

const STATES = ["not_started", "learning", "practicing", "applied", "mastered"] as const;
const LABELS: Record<(typeof STATES)[number], string> = {
  not_started: "Not started", learning: "Learning", practicing: "Practicing", applied: "Applied", mastered: "Mastered",
};

export default function DetailedLearningPathPage() {
  const { user } = useUser();
  const { data: enrollment } = useActiveUserRoadmap(user?.id);
  const { data: phases, isLoading, mutate } = useDetailedRoadmap(user?.id);
  const topicIds = useMemo(() => phases?.flatMap((phase) => phase.modules.flatMap((module) => module.topics.map((topic) => topic.id))) ?? [], [phases]);
  const { data: notes, mutate: mutateNotes } = useDetailedRoadmapTopicNotes(user?.id, topicIds);
  const [savingTopic, setSavingTopic] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});

  async function updateStatus(topicId: string, status: (typeof STATES)[number]) {
    if (!user?.id) return;
    setSavingTopic(topicId);
    try {
      await setDetailedRoadmapTopicStatus(user.id, topicId, status);
      await mutate();
      toast.success("Progress saved");
    } catch {
      toast.error("Could not save progress");
    } finally {
      setSavingTopic(null);
    }
  }

  async function saveNote(topicId: string) {
    if (!user?.id || !noteDrafts[topicId]?.trim()) return;
    try {
      await saveDetailedRoadmapTopicNote(user.id, topicId, noteDrafts[topicId].trim());
      setNoteDrafts((current) => ({ ...current, [topicId]: "" }));
      await mutateNotes();
      toast.success("Note saved");
    } catch {
      toast.error("Could not save note");
    }
  }

  async function addEvidence(topicId: string) {
    if (!user?.id || !evidenceDrafts[topicId]?.trim()) return;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: current, error: readError } = await supabase.from("user_roadmap_topic_progress").select("evidence,status").eq("user_id", user.id).eq("topic_id", topicId).maybeSingle();
      if (readError) throw readError;
      const existingEvidence = ((current as { evidence?: unknown[] } | null)?.evidence ?? []) as unknown[];
      const evidence = [...existingEvidence, { note: evidenceDrafts[topicId].trim(), recorded_at: new Date().toISOString() }];
      const { error } = await supabase.from("user_roadmap_topic_progress").upsert({ user_id: user.id, topic_id: topicId, status: (current as { status?: (typeof STATES)[number] } | null)?.status ?? "learning", evidence } as never, { onConflict: "user_id,topic_id" });
      if (error) throw error;
      setEvidenceDrafts((drafts) => ({ ...drafts, [topicId]: "" }));
      await mutate();
      toast.success("Evidence recorded");
    } catch {
      toast.error("Could not save evidence");
    }
  }

  if (isLoading || !user) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>;
  if (!phases) {
    return <Card><CardHeader><CardTitle>Detailed learning path</CardTitle></CardHeader><CardContent>Your detailed curriculum is not available yet. The original ZTE curriculum remains available on the Roadmap page.</CardContent></Card>;
  }

  const allTopics = phases.flatMap((phase) => phase.modules.flatMap((module) => module.topics));
  const done = allTopics.filter((topic) => topic.progress?.status === "mastered").length;
  const completedPhases = phases.filter((phase) => phase.modules.every((module) => module.topics.every((topic) => topic.progress?.status === "mastered"))).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Personalized curriculum · {enrollment?.weekly_hours ?? "Set your availability"} {enrollment?.weekly_hours ? "hours/week" : ""}</p>
        <h1 className="text-3xl font-semibold">Your learning path</h1>
        <p className="max-w-3xl text-muted-foreground">Learn each concept, practice it, apply it in projects, then record evidence before marking it mastered.</p>
        <Progress value={allTopics.length ? (done / allTopics.length) * 100 : 0} />
        <p className="text-sm text-muted-foreground">{done} of {allTopics.length} topics mastered · {completedPhases} of {phases.length} phases complete</p>
      </div>

      {phases.map((phase) => {
        const phaseTopics = phase.modules.flatMap((module) => module.topics);
        const mastered = phaseTopics.filter((topic) => topic.progress?.status === "mastered").length;
        return <Card key={phase.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Phase {phase.phase_number}</Badge><Badge>{phase.band}</Badge><span className="text-xs text-muted-foreground">{phase.estimated_hours} hours</span></div>
            <CardTitle>{phase.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{phase.description}</p>
            <Progress value={phaseTopics.length ? (mastered / phaseTopics.length) * 100 : 0} />
          </CardHeader>
          <CardContent className="space-y-6">
            {phase.modules.map((module) => <section key={module.id} className="space-y-3">
              <div><h3 className="font-medium">{module.title}</h3><p className="text-xs text-muted-foreground">{module.description} · {module.estimated_hours}h</p></div>
              {module.topics.map((topic) => <article key={topic.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h4 className="font-medium">{topic.title}</h4><p className="text-xs text-muted-foreground">{topic.estimated_minutes} min · {topic.difficulty}</p></div>
                  <Select value={topic.progress?.status ?? "not_started"} onValueChange={(value) => void updateStatus(topic.id, value as (typeof STATES)[number])}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATES.map((status) => <SelectItem key={status} value={status}>{LABELS[status]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground"><BookOpen className="mr-1 inline size-3" />Learning objectives</p><ul className="list-disc space-y-1 pl-4 text-sm">{topic.learning_objectives.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Practice</p><ul className="list-disc space-y-1 pl-4 text-sm">{topic.practice_tasks.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground"><Check className="mr-1 inline size-3" />Evidence</p><ul className="list-disc space-y-1 pl-4 text-sm">{topic.completion_evidence.map((item) => <li key={item}>{item}</li>)}</ul></div>
                </div>
                {topic.prerequisite_topic_ids.length > 0 && <div className="mt-4 rounded-md bg-muted/40 p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Recommended prerequisites</p><ul className="mt-1 list-disc pl-4 text-sm">{topic.prerequisite_topic_ids.map((id) => { const prerequisite = allTopics.find((candidate) => candidate.id === id); return prerequisite ? <li key={id}>{prerequisite.title} · {LABELS[prerequisite.progress?.status ?? "not_started"]}</li> : null; })}</ul><p className="mt-1 text-xs text-muted-foreground">These are suggested foundations. You can continue if you already know the material.</p></div>}
                {topic.learning_resources.length > 0 && <div className="mt-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Resources</p><ul className="mt-1 list-disc pl-4 text-sm">{topic.learning_resources.map((resource) => <li key={`${resource.label}-${resource.url}`}><a href={resource.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{resource.label}</a></li>)}</ul></div>}
                {topic.progress?.next_review_at && <p className="mt-3 text-xs text-muted-foreground">{Date.parse(topic.progress.next_review_at) <= Date.now() ? "Review due" : "Review scheduled"}: {new Date(topic.progress.next_review_at).toLocaleDateString()} · review {topic.progress.review_count}</p>}
                <div className="mt-4 space-y-2">
                  <Textarea value={noteDrafts[topic.id] ?? ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [topic.id]: event.target.value }))} placeholder="Capture a note or question for this topic" aria-label={`Note for ${topic.title}`} />
                  <button className="text-sm font-medium text-primary disabled:opacity-50" disabled={!noteDrafts[topic.id]?.trim()} onClick={() => void saveNote(topic.id)}>Save note</button>
                  {(notes ?? []).filter((note) => note.topic_id === topic.id).map((note) => <p key={note.id} className="rounded bg-muted/40 p-2 text-sm">{note.note}</p>)}
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">My evidence</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm">{(topic.progress?.evidence ?? []).map((entry, index) => <li key={index}>{typeof entry === "object" && entry !== null && "note" in entry ? String((entry as { note: unknown }).note) : String(entry)}</li>)}</ul>
                  <div className="flex gap-2"><Input value={evidenceDrafts[topic.id] ?? ""} onChange={(event) => setEvidenceDrafts((drafts) => ({ ...drafts, [topic.id]: event.target.value }))} placeholder="Link or describe your evidence" aria-label={`Evidence for ${topic.title}`} /><button className="text-sm font-medium text-primary disabled:opacity-50" disabled={!evidenceDrafts[topic.id]?.trim()} onClick={() => void addEvidence(topic.id)}>Add evidence</button></div>
                </div>
                {savingTopic === topic.id && <p className="mt-2 text-xs text-muted-foreground"><Loader2 className="mr-1 inline size-3 animate-spin" />Saving progress</p>}
              </article>)}
            </section>)}
            {phase.projects.length > 0 && <section className="space-y-3"><h3 className="font-medium"><BriefcaseBusiness className="mr-2 inline size-4" />Applied projects</h3>{phase.projects.map((project) => <DetailedProjectProgressCard key={project.id} project={project} userId={user.id} onSaved={mutate} />)}</section>}
          </CardContent>
        </Card>;
      })}
    </div>
  );
}

const PROJECT_STATUSES = ["not_started", "planning", "building", "review", "complete"] as const;
type DetailedProjectView = DetailedRoadmapProject & { progress: UserRoadmapProjectProgress | null };

function DetailedProjectProgressCard({ project, userId, onSaved }: { project: DetailedProjectView; userId: string; onSaved: () => Promise<unknown> }) {
  const [status, setStatus] = useState<UserRoadmapProjectProgress["status"]>(project.progress?.status ?? "not_started");
  const [repositoryUrl, setRepositoryUrl] = useState(project.progress?.repository_url ?? "");
  const [deployedUrl, setDeployedUrl] = useState(project.progress?.deployed_url ?? "");
  const [notes, setNotes] = useState(project.progress?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await setDetailedRoadmapProjectProgress(userId, project.id, {
        status,
        repository_url: repositoryUrl.trim() || null,
        deployed_url: deployedUrl.trim() || null,
        notes: notes.trim() || null,
      });
      await onSaved();
      toast.success("Project progress saved");
    } catch {
      toast.error("Could not save project progress");
    } finally {
      setSaving(false);
    }
  }

  return <div className="rounded-lg bg-muted/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-medium">{project.title}</h4><p className="mt-1 text-sm text-muted-foreground">{project.problem_statement}</p></div><Select value={status} onValueChange={(value) => setStatus(value as UserRoadmapProjectProgress["status"])}><SelectTrigger className="w-40" aria-label={`Progress for ${project.title}`}><SelectValue /></SelectTrigger><SelectContent>{PROJECT_STATUSES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
    <div className="mt-3 grid gap-4 md:grid-cols-2"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Milestones</p><ol className="list-decimal space-y-1 pl-4 text-sm">{project.milestones.map((item) => <li key={item}>{item}</li>)}</ol></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Deliverables</p><ul className="list-disc space-y-1 pl-4 text-sm">{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
    <p className="mt-3 text-xs text-muted-foreground">Skills: {project.skills.join(" · ")}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2"><Input type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="Repository URL" aria-label={`Repository URL for ${project.title}`} /><Input type="url" value={deployedUrl} onChange={(event) => setDeployedUrl(event.target.value)} placeholder="Live project URL" aria-label={`Live project URL for ${project.title}`} /></div>
    <Textarea className="mt-2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Project notes, decisions, and evidence" aria-label={`Notes for ${project.title}`} />
    <button className="mt-2 text-sm font-medium text-primary disabled:opacity-50" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save project progress"}</button>
  </div>;
}
