"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/use-user";
import { useTopicDetail, useProgress, useRoadmap, useAllTopicNotes, useTopicResources, addTopicResource, deleteTopicResource, updateTopicProgress, useLinkRegistry } from "@/lib/hooks/use-roadmap";
import { useUserSettings, pinItem, unpinItem, isPinned } from "@/lib/hooks/use-user-settings";
import { useTopicLockingDisabled } from "@/lib/hooks/use-topic-locking";
import { isTopicLocked } from "@/lib/topic-prerequisites";
import { computeNextReviewDue, MASTERY_REVIEW_COUNT } from "@/lib/revision-schedule";
import { computeBacklinks } from "@/lib/note-links";
import { NoteText } from "@/components/roadmap/note-text";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/roadmap/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHours } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Link2, BookOpen, ExternalLink, Lock, Pin, PinOff } from "lucide-react";
import type { TopicNote, Difficulty, ResourceType, TopicWithProgress } from "@/types/database";

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: topic, isLoading } = useTopicDetail(params.id);
  const { data: progress, mutate: mutateProgress } = useProgress(user?.id);
  const { data: roadmap } = useRoadmap();
  const { data: allNotes } = useAllTopicNotes(user?.id);
  const linkRegistry = useLinkRegistry();
  const { data: resources, mutate: mutateResources } = useTopicResources(user?.id, params.id);
  const { disabled: topicLockingDisabled } = useTopicLockingDisabled(user?.id);
  const { data: settings, mutate: mutateSettings } = useUserSettings(user?.id);
  const [pinning, setPinning] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("link");
  const [savingResource, setSavingResource] = useState(false);
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [minutesInput, setMinutesInput] = useState("");
  const [isMinutesDirty, setIsMinutesDirty] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const myProgress = (progress ?? []).find((p) => p.topic_id === params.id);

  useEffect(() => {
    if (!params.id || !user) return;
    const supabase = createClient();
    supabase
      .from("topic_notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic_id", params.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotes((data ?? []) as TopicNote[]);
      });
  }, [params.id, user]);

  useEffect(() => {
    const next = String(myProgress?.actual_minutes_spent ?? "");
    if (minutesInput !== next) {
      // Avoid setting state synchronously in the effect body to prevent
      // cascading renders; schedule update on next tick.
      const t = setTimeout(() => setMinutesInput(next), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [myProgress?.actual_minutes_spent, minutesInput]);

  const allTopics = roadmap?.topics ?? [];
  const backlinks =
    topic && allNotes
      ? computeBacklinks({ type: "topic", id: topic.id, label: topic.title }, allNotes, allTopics, linkRegistry)
      : [];

  // Stage 3 — Item 34: topic-level prerequisite lock. Build this topic's
  // sibling stage-mates as TopicWithProgress (roadmap.topics is flat/static;
  // progress is joined in separately here, same shape usePhasesWithProgress
  // builds, but scoped to just this stage since that's all the lock check
  // needs).
  const progressMap = new Map((progress ?? []).map((p) => [p.topic_id, p]));
  const stageTopics: TopicWithProgress[] = topic
    ? allTopics
        .filter((t) => t.stage_id === topic.stage_id)
        .map((t) => ({ ...t, progress: progressMap.get(t.id) ?? null }))
    : [];
  const lockInfo =
    topic && !topicLockingDisabled
      ? isTopicLocked({ ...topic, progress: progressMap.get(topic.id) ?? null }, stageTopics)
      : { locked: false };
  const isLocked = lockInfo.locked;

  // Item 47 — global next/prev topic order: phases in order_index order,
  // topics within a phase in their own order_index — the same ordering
  // usePhasesWithProgress/Dashboard's nextTopic walk already relies on,
  // just flattened here without needing progress data.
  const orderedTopics = useMemo(() => {
    if (!roadmap) return [];
    const phaseOrder = new Map(roadmap.phases.map((p) => [p.id, p.order_index]));
    return [...allTopics].sort((a, b) => {
      const pa = phaseOrder.get(a.phase_id) ?? 0;
      const pb = phaseOrder.get(b.phase_id) ?? 0;
      if (pa !== pb) return pa - pb;
      return a.order_index - b.order_index;
    });
  }, [roadmap, allTopics]);

  const currentIndex = topic ? orderedTopics.findIndex((t) => t.id === topic.id) : -1;
  const prevTopicId = currentIndex > 0 ? orderedTopics[currentIndex - 1]?.id : null;
  const nextTopicId =
    currentIndex >= 0 && currentIndex < orderedTopics.length - 1 ? orderedTopics[currentIndex + 1]?.id : null;

  // Item 47 — keyboard bindings scoped to this page: j/k next/prev topic
  // (mirrors shortcuts-help's existing "no binding while typing" guard),
  // x toggles mark-complete, n focuses the notes composer. Global "G then
  // <letter>" chords live in ShortcutsHelp; these are page-local actions
  // that component has no way to reach (it doesn't know about this
  // topic's id or completion state).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "j" && nextTopicId) {
        e.preventDefault();
        router.push(`/roadmap/topic/${nextTopicId}`);
      } else if (e.key === "k" && prevTopicId) {
        e.preventDefault();
        router.push(`/roadmap/topic/${prevTopicId}`);
      } else if (e.key === "x" && !isLocked && topic) {
        e.preventDefault();
        handleToggleComplete(!myProgress?.completed);
      } else if (e.key === "n") {
        e.preventDefault();
        notesTextareaRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [nextTopicId, prevTopicId, isLocked, topic, myProgress?.completed]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!topic) return <p className="text-sm text-muted">Topic not found.</p>;

  const parentPhase = (roadmap?.phases ?? []).find((p) => p.id === topic.phase_id) ?? null;
  const parentStage = (roadmap?.stages ?? []).find((s) => s.id === topic.stage_id) ?? null;

  async function handleToggleComplete(completed: boolean) {
    if (!user || !topic || isLocked) return;
    await updateTopicProgress(user.id, topic.id, {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    });
    mutateProgress();
  }

  async function handleDifficultyChange(value: string) {
    if (!user || !topic) return;
    await updateTopicProgress(user.id, topic.id, { difficulty: value as Difficulty });
    mutateProgress();
  }

  async function handleRevisionChange(value: string) {
    if (!user || !topic) return;
    // Keep consistent with the tier/schedule system on /revision — see
    // the matching comment in topic-detail-sheet.tsx for the reasoning.
    const status = value as "needs_revision" | "comfortable" | "mastered";
    const patch: Parameters<typeof updateTopicProgress>[2] = {
      revision_status: status,
      last_reviewed: new Date().toISOString(),
    };
    if (status === "mastered") {
      patch.review_count = MASTERY_REVIEW_COUNT;
      patch.next_review_due = null;
    } else if (status === "needs_revision") {
      patch.review_count = 0;
      patch.next_review_due = computeNextReviewDue(0);
    }
    await updateTopicProgress(user.id, topic.id, patch);
    mutateProgress();
  }

  async function handleSaveMinutes() {
    if (!user || !topic) return;
    const minutes = parseInt(minutesInput || "0", 10);
    await updateTopicProgress(user.id, topic.id, { actual_minutes_spent: minutes });
    mutateProgress();
    toast.success("Time updated");
  }

  async function handleAddNote() {
    if (!user || !topic || !newNote.trim()) return;
    setSavingNote(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("topic_notes")
      .insert({ user_id: user.id, topic_id: topic.id, note: newNote.trim() } as never)
      .select()
      .single();
    setSavingNote(false);
    if (error) {
      toast.error("Couldn't save note.");
      return;
    }
    setNotes((prev) => [data as TopicNote, ...prev]);
    setNewNote("");
  }

  async function handleDeleteNote(id: string) {
    const supabase = createClient();
    await supabase.from("topic_notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleAddResource() {
    if (!user || !topic || !resourceTitle.trim() || !resourceUrl.trim()) return;
    setSavingResource(true);
    try {
      await addTopicResource(user.id, topic.id, {
        title: resourceTitle.trim(),
        url: resourceUrl.trim(),
        resource_type: resourceType,
      });
      await mutateResources();
      setResourceTitle("");
      setResourceUrl("");
      setResourceType("link");
    } catch {
      toast.error("Couldn't save resource.");
    } finally {
      setSavingResource(false);
    }
  }

  async function handleDeleteResource(id: string) {
    try {
      await deleteTopicResource(id);
      await mutateResources();
    } catch {
      toast.error("Couldn't delete.");
    }
  }

  async function handleTogglePin() {
    if (!user || !topic) return;
    setPinning(true);
    try {
      if (isPinned(settings?.pinned_items, "topic", topic.id)) {
        await unpinItem(user.id, "topic", topic.id);
        toast.success("Unpinned");
      } else {
        await pinItem(user.id, { type: "topic", id: topic.id, label: topic.title });
        toast.success("Pinned to Workspace");
      }
      await mutateSettings();
    } catch {
      toast.error("Couldn't update pin. Try again.");
    } finally {
      setPinning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Breadcrumbs
        items={[
          ...(parentPhase
            ? [{ label: `Phase ${parentPhase.phase_number} — ${parentPhase.title}`, href: `/roadmap/phase/${parentPhase.id}` }]
            : []),
          ...(parentStage
            ? [{ label: `Stage ${parentStage.stage_number} — ${parentStage.title}`, href: `/roadmap/stage/${parentStage.id}` }]
            : []),
          { label: topic.title },
        ]}
      />

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleTogglePin}
            disabled={pinning}
            title={isPinned(settings?.pinned_items, "topic", topic.id) ? "Unpin from Workspace" : "Pin to Workspace"}
          >
            {isPinned(settings?.pinned_items, "topic", topic.id) ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
          <Link
            href={prevTopicId ? `/roadmap/topic/${prevTopicId}` : "#"}
            aria-disabled={!prevTopicId}
            className={`text-xs px-2 py-1 rounded border border-border ${
              prevTopicId ? "hover:text-foreground hover:border-accent" : "text-muted/40 pointer-events-none"
            }`}
            title="Previous topic (k)"
          >
            ← k
          </Link>
          <Link
            href={nextTopicId ? `/roadmap/topic/${nextTopicId}` : "#"}
            aria-disabled={!nextTopicId}
            className={`text-xs px-2 py-1 rounded border border-border ${
              nextTopicId ? "hover:text-foreground hover:border-accent" : "text-muted/40 pointer-events-none"
            }`}
            title="Next topic (j)"
          >
            j →
          </Link>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          checked={!!myProgress?.completed}
          onCheckedChange={(v) => handleToggleComplete(v === true)}
          disabled={isLocked}
          className="mt-1.5"
        />
        <div className="flex-1">
          <h1 className="text-page-title font-semibold tracking-tight">{topic.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {topic.estimated_hours && (
              <span className="text-xs text-muted font-mono-tabular">
                {formatHours(topic.estimated_hours)}
              </span>
            )}
            {myProgress?.completed && <Badge variant="success">Complete</Badge>}
            {isLocked && (
              <Badge variant="warning" className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Requires: {lockInfo.requiredTitle}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {topic.intro && (
        <Card>
          <CardContent noHeader>
            <p className="text-sm text-foreground/90">{topic.intro}</p>
          </CardContent>
        </Card>
      )}

      {isLocked && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3">
          <Lock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80">
            This topic is locked until <span className="font-medium">{lockInfo.requiredTitle}</span> is marked
            complete. You can disable topic locking in{" "}
            <Link href="/settings" className="text-accent hover:underline">
              Settings
            </Link>
            .
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tracking</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Difficulty</Label>
              <Select value={myProgress?.difficulty ?? undefined} onValueChange={handleDifficultyChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Revision status</Label>
              <Select value={myProgress?.revision_status ?? undefined} onValueChange={handleRevisionChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs_revision">Needs revision</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="mastered">Mastered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Actual minutes spent</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                className="w-28"
              />
              <Button size="sm" variant="secondary" onClick={handleSaveMinutes}>
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              ref={notesTextareaRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a journal entry for this topic… use [[Name]] to link a topic, project, or ClientSync milestone"
              className="flex-1"
              rows={2}
            />
            <Button size="sm" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {loadingNotes && <p className="text-xs text-muted">Loading notes…</p>}
            {!loadingNotes && notes.length === 0 && <p className="text-xs text-muted">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="flex items-start gap-2 rounded-md bg-surface-2 p-2 text-sm">
                <div className="flex-1">
                  <p>
                    <NoteText text={n.note} registry={linkRegistry} />
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    {new Date(n.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button onClick={() => handleDeleteNote(n.id)} className="text-muted hover:text-danger shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Resources
          </CardTitle>
          <p className="text-xs text-muted mt-1">
            Official docs curated for this topic, plus your own added links and videos.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Title"
              value={resourceTitle}
              onChange={(e) => setResourceTitle(e.target.value)}
              className="sm:flex-1"
            />
            <Input
              placeholder="URL"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              className="sm:flex-1"
            />
            <Select value={resourceType} onValueChange={(v) => setResourceType(v as ResourceType)}>
              <SelectTrigger className="sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doc">Doc</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAddResource}
              disabled={savingResource || !resourceTitle.trim() || !resourceUrl.trim()}
            >
              {savingResource ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            {(resources ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md bg-surface-2 p-2 text-sm">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {r.resource_type}
                </Badge>
                {r.curated && (
                  <Badge variant="accent" className="text-[10px] shrink-0">
                    Curated
                  </Badge>
                )}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate text-accent hover:underline flex items-center gap-1"
                >
                  {r.title} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                {!r.curated && (
                  <button
                    onClick={() => handleDeleteResource(r.id)}
                    className="text-muted hover:text-danger shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(resources ?? []).length === 0 && (
              <p className="text-xs text-muted">No resources yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {backlinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Linked from
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {backlinks.map(({ note, sourceTopic }) => (
              <Link
                key={note.id}
                href={`/roadmap/topic/${sourceTopic.id}`}
                className="block rounded-md bg-surface-2 p-2 text-sm hover:bg-surface-2/70 transition-standard"
              >
                <p className="text-xs text-accent font-medium mb-0.5">{sourceTopic.title}</p>
                <p className="text-muted line-clamp-2">{note.note}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}