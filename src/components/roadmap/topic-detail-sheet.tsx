"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/lib/hooks/use-user";
import { updateTopicProgress, useLinkRegistry } from "@/lib/hooks/use-roadmap";
import { useTopicDayMap, getManualDayForTopic } from "@/lib/hooks/use-manual-day";
import { TodaysLesson } from "@/components/dashboard/todays-lesson";
import { computeNextReviewDue, MASTERY_REVIEW_COUNT } from "@/lib/revision-schedule";
import { NoteText } from "@/components/roadmap/note-text";
import { createClient } from "@/lib/supabase/client";
import type { TopicNote, TopicWithProgress, Difficulty } from "@/types/database";
import { formatHours } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";

export function TopicDetailSheet({
  topic,
  onClose,
  onUpdated,
}: {
  topic: TopicWithProgress | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { user } = useUser();
  const linkRegistry = useLinkRegistry();
  const { data: topicDayMap } = useTopicDayMap();
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [minutesInput, setMinutesInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (!topic || !user) return;
    setLoadingNotes(true);
    const supabase = createClient();
    supabase
      .from("topic_notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotes((data ?? []) as TopicNote[]);
        setLoadingNotes(false);
      });
    setMinutesInput(String(topic.progress?.actual_minutes_spent ?? ""));
  }, [topic, user]);

  if (!topic) return null;

  const lessonDay = getManualDayForTopic(topic.id, topicDayMap);

  async function handleDifficultyChange(value: string) {
    if (!user || !topic) return;
    await updateTopicProgress(user.id, topic.id, { difficulty: value as Difficulty });
    onUpdated();
  }

  async function handleRevisionChange(value: string) {
    if (!user || !topic) return;
    // Keep this manual override consistent with the tier/schedule system
    // introduced on /revision: setting "mastered" here should actually
    // exit the review schedule (not just relabel it), and setting "needs
    // revision" should restart it, so the two surfaces never show
    // contradictory state (e.g. this panel says "mastered" while /revision
    // still lists it as due for a 1st review). "Comfortable" has no single
    // correct review_count to snap to — it's the label used for every
    // mid-schedule tier — so it's left as label-only here.
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
    onUpdated();
  }

  async function handleSaveMinutes() {
    if (!user || !topic) return;
    const minutes = parseInt(minutesInput || "0", 10);
    await updateTopicProgress(user.id, topic.id, { actual_minutes_spent: minutes });
    onUpdated();
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

  return (
    <Dialog open={!!topic} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{topic.title}</DialogTitle>
          <DialogDescription>
            {topic.estimated_hours ? `Estimated ${formatHours(topic.estimated_hours)}` : "No estimate"}
            {topic.progress?.completed && (
              <Badge variant="success" className="ml-2">
                Complete
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Difficulty</Label>
            <Select value={topic.progress?.difficulty ?? undefined} onValueChange={handleDifficultyChange}>
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
            <Select value={topic.progress?.revision_status ?? undefined} onValueChange={handleRevisionChange}>
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

        {lessonDay && (
          <>
            <Separator />
            {/* Same manual-lesson content Daily Mission shows for the
                current topic, but here it's browsable for ANY topic —
                including ones far ahead of where the user actually is —
                since this dialog opens from clicking any topic on
                /roadmap, not just today's. Reuses TodaysLesson as-is: the
                checkable items it renders are keyed by day number, so
                checking one here and seeing it again later on Daily
                Mission (once that topic becomes "today's") is the same
                state, not a separate copy. */}
            <TodaysLesson day={lessonDay} userId={user?.id} />
          </>
        )}

        <Separator />

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

        <Separator />

        <div>
          <Label>Notes</Label>
          <div className="flex gap-2 mt-1">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a journal entry… use [[Name]] to link a topic, project, or ClientSync milestone"
              className="flex-1"
              rows={2}
            />
            <Button size="sm" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
            {loadingNotes && <p className="text-xs text-muted">Loading notes…</p>}
            {!loadingNotes && notes.length === 0 && (
              <p className="text-xs text-muted">No notes yet.</p>
            )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
