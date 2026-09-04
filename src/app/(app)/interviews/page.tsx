"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import {
  useCareerTracker,
  useInterviewRounds,
  upsertCareerEntry,
  createInterviewRound,
  updateInterviewRound,
  deleteInterviewRound,
  INTERVIEW_ROUND_TYPES,
} from "@/lib/hooks/use-career";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2, Plus, Trash2, X, Check, Brain } from "lucide-react";
import type { CareerTrackerRow, InterviewRound, InterviewRoundType, InterviewRoundResult } from "@/types/database";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { InterviewPrepTab } from "@/components/interviews/interview-prep-tab";

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function formatCountdown(days: number) {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days}d`;
}

const RESULT_VARIANT: Record<InterviewRoundResult, "outline" | "success" | "danger" | "default"> = {
  pending: "outline",
  passed: "success",
  failed: "danger",
  cancelled: "default",
};

function InterviewsTrackerTab() {
  const { user } = useUser();
  const { data: entries, mutate, isLoading } = useCareerTracker(user?.id);
  const { data: rounds, mutate: mutateRounds } = useInterviewRounds(user?.id);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [addingRoundFor, setAddingRoundFor] = useState<string | null>(null);
  const [roundDraft, setRoundDraft] = useState<{ round_type: InterviewRoundType; scheduled_at: string }>({
    round_type: "technical",
    scheduled_at: "",
  });

  const roundsByApplication = useMemo(() => {
    const map = new Map<string, InterviewRound[]>();
    for (const r of rounds ?? []) {
      const list = map.get(r.application_id) ?? [];
      list.push(r);
      map.set(r.application_id, list);
    }
    return map;
  }, [rounds]);

  const withInterviews = (entries ?? []).filter((e) => !!e.interview_date) as (CareerTrackerRow & {
    interview_date: string;
  })[];

  const upcoming = useMemo(
    () =>
      withInterviews
        .filter((e) => daysUntil(e.interview_date) >= 0)
        .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime()),
    [withInterviews]
  );

  const past = useMemo(
    () =>
      withInterviews
        .filter((e) => daysUntil(e.interview_date) < 0)
        .sort((a, b) => new Date(b.interview_date).getTime() - new Date(a.interview_date).getTime()),
    [withInterviews]
  );

  async function saveNotes(entry: CareerTrackerRow) {
    if (!user) return;
    const draft = notesDraft[entry.id];
    if (draft === undefined) return;
    setSaving(entry.id);
    try {
      await upsertCareerEntry(user.id, { ...entry, notes: draft });
      await mutate();
      toast.success("Notes saved");
    } catch {
      toast.error("Couldn't save notes");
    } finally {
      setSaving(null);
    }
  }

  async function handleAddRound(applicationId: string) {
    if (!user) return;
    try {
      await createInterviewRound(user.id, applicationId, {
        round_type: roundDraft.round_type,
        scheduled_at: roundDraft.scheduled_at ? new Date(roundDraft.scheduled_at).toISOString() : null,
      });
      await mutateRounds();
      setAddingRoundFor(null);
      setRoundDraft({ round_type: "technical", scheduled_at: "" });
    } catch {
      toast.error("Couldn't add round.");
    }
  }

  async function handleSetResult(round: InterviewRound, result: InterviewRoundResult) {
    try {
      await updateInterviewRound(round.id, { result, completed: result !== "pending" });
      await mutateRounds();
    } catch {
      toast.error("Couldn't update round.");
    }
  }

  async function handleDeleteRound(id: string) {
    try {
      await deleteInterviewRound(id);
      await mutateRounds();
    } catch {
      toast.error("Couldn't delete round.");
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-muted mb-2 flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4" /> Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">
              No upcoming interviews. Add an interview date on a Career Tracker entry to see it here.
            </CardContent>
          </Card>
        )}
        <StaggerContainer className="flex flex-col gap-3">
          {upcoming.map((entry) => {
            const days = daysUntil(entry.interview_date);
            const appRounds = (roundsByApplication.get(entry.id) ?? []).sort(
              (a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")
            );
            return (
              <StaggerItem key={entry.id}>
              <Card className={cn(days <= 2 ? "border-warning/50" : undefined, "glow-card")}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle>{entry.company}</CardTitle>
                    {entry.role && <p className="text-xs text-muted mt-0.5">{entry.role}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={days <= 2 ? "warning" : "outline"}>{formatCountdown(days)}</Badge>
                    <span className="text-[11px] text-muted font-mono-tabular">
                      {new Date(entry.interview_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {/* Interview rounds for this application */}
                  <div className="flex flex-col gap-1.5">
                    {appRounds.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 group">
                        <span className="text-xs font-medium flex-1">
                          {INTERVIEW_ROUND_TYPES.find((t) => t.value === r.round_type)?.label ?? r.round_type}
                        </span>
                        {r.scheduled_at && (
                          <span className="text-[11px] text-muted font-mono-tabular hidden sm:inline">
                            {new Date(r.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        )}
                        <Badge variant={RESULT_VARIANT[r.result]} className="text-[10px]">
                          {r.result}
                        </Badge>
                        {r.result === "pending" && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-standard">
                            <button
                              onClick={() => handleSetResult(r, "passed")}
                              className="text-success hover:text-success/80"
                              aria-label="Mark passed"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSetResult(r, "failed")}
                              className="text-danger hover:text-danger/80"
                              aria-label="Mark failed"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteRound(r.id)}
                          className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-standard"
                          aria-label="Delete round"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {addingRoundFor === entry.id ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={roundDraft.round_type}
                          onValueChange={(v) => setRoundDraft((d) => ({ ...d, round_type: v as InterviewRoundType }))}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTERVIEW_ROUND_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          className="h-8 text-xs w-36"
                          value={roundDraft.scheduled_at}
                          onChange={(e) => setRoundDraft((d) => ({ ...d, scheduled_at: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" onClick={() => handleAddRound(entry.id)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingRoundFor(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingRoundFor(entry.id)}
                        className="text-xs text-muted hover:text-foreground flex items-center gap-1 self-start"
                      >
                        <Plus className="h-3 w-3" /> Add round
                      </button>
                    )}
                  </div>

                  <Textarea
                    placeholder="Prep notes — topics to revise, questions to expect, company research…"
                    rows={3}
                    defaultValue={entry.notes ?? ""}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving === entry.id || notesDraft[entry.id] === undefined}
                      onClick={() => saveNotes(entry)}
                    >
                      {saving === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted mb-2">Past ({past.length})</h2>
          <div className="flex flex-col gap-1">
            {past.map((entry) => {
              const appRounds = roundsByApplication.get(entry.id) ?? [];
              const passed = appRounds.filter((r) => r.result === "passed").length;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-card border border-border px-3.5 py-3 transition-standard hover:border-muted-2/40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.company}</p>
                    {entry.role && <p className="text-xs text-muted truncate">{entry.role}</p>}
                  </div>
                  {appRounds.length > 0 && (
                    <span className="text-xs text-muted font-mono-tabular hidden sm:inline">
                      {passed}/{appRounds.length} rounds passed
                    </span>
                  )}
                  <Badge variant="outline">{entry.application_status}</Badge>
                  <span className="text-xs text-muted font-mono-tabular hidden sm:inline">
                    {new Date(entry.interview_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InterviewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") === "prep" ? "prep" : "tracker";

  function setTab(tab: string) {
    router.replace(tab === "tracker" ? "/interviews" : `/interviews?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-page-title font-semibold tracking-tight">Interviews</h1>
          <p className="text-sm text-muted mt-1">
            Rounds per application, plus practice questions and weakness tracking — one place for interview prep.
          </p>
        </div>
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="tracker">
              <CalendarClock className="h-3.5 w-3.5" /> Tracker
            </TabsTrigger>
            <TabsTrigger value="prep">
              <Brain className="h-3.5 w-3.5" /> Practice
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      </FadeUp>

      {activeTab === "tracker" ? <InterviewsTrackerTab /> : <InterviewPrepTab />}
    </div>
  );
}
