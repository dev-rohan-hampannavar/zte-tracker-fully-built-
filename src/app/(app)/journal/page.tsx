"use client";

/* eslint-disable react/no-unescaped-entities -- prose intentionally uses natural punctuation. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useDailyLogs, saveJournalEntry } from "@/lib/hooks/use-daily-logs";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { todayISO, formatHours, localDateISO } from "@/lib/utils";
import { toast } from "sonner";
import { BookMarked, Lightbulb, AlertTriangle, Sparkles, Target, Loader2, ChevronDown, CalendarRange } from "lucide-react";
import type { DailyLog } from "@/types/database";
import { FadeUp } from "@/components/motion/primitives";

/**
 * Split out so it can be keyed by todayLog's identity in the parent —
 * remounting with fresh initial state when the fetched row changes is
 * simpler and avoids the setState-in-effect pattern that a "hydrate once
 * data arrives" useEffect would need.
 */
function TodayForm({ userId, todayLog, onSaved }: { userId: string; todayLog: DailyLog | undefined; onSaved: () => void }) {
  const [learned, setLearned] = useState(todayLog?.learned ?? "");
  const [mistakes, setMistakes] = useState(todayLog?.mistakes ?? "");
  const [wins, setWins] = useState(todayLog?.wins ?? "");
  const [tomorrowGoal, setTomorrowGoal] = useState(todayLog?.tomorrow_goal ?? "");
  const [dayJobHours, setDayJobHours] = useState(todayLog?.day_job_hours?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  // Separate from `saving`: the explicit Save button's spinner should only
  // reflect an explicit click, not a background autosave, so the two don't
  // fight over the same "Saving…" label for different triggers.
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  // True once any field has actually been edited by the person this
  // mount — this is what gates autosave, so the effect below never fires
  // from initial hydration (component key-remounts with todayLog's own
  // values on every fetch, per the note above; without this guard that
  // remount would look identical to an edit and trigger a pointless
  // no-op upsert).
  const hasEditedRef = useRef(false);

  async function persist(values: { learned: string; mistakes: string; wins: string; tomorrowGoal: string; dayJobHours: string }) {
    const parsedDayJobHours = values.dayJobHours.trim() === "" ? null : Number(values.dayJobHours);
    await saveJournalEntry(userId, {
      learned: values.learned.trim(),
      mistakes: values.mistakes.trim(),
      wins: values.wins.trim(),
      tomorrow_goal: values.tomorrowGoal.trim(),
      day_job_hours: parsedDayJobHours !== null && Number.isFinite(parsedDayJobHours) ? parsedDayJobHours : null,
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await persist({ learned, mistakes, wins, tomorrowGoal, dayJobHours });
      onSaved();
      toast.success("Journal saved");
    } catch {
      toast.error("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const debouncedAutosave = useDebouncedCallback(
    async (values: { learned: string; mistakes: string; wins: string; tomorrowGoal: string; dayJobHours: string }) => {
      setAutosaveStatus("saving");
      try {
        await persist(values);
        // Deliberately no onSaved()/mutate() here: revalidating on every
        // autosave would refetch todayLog, whose updated_at feeds this
        // component's `key` in the parent, remounting the form mid-type
        // and losing focus/cursor position. The explicit Save button still
        // calls onSaved() for that reason — autosave silently persists in
        // the background without touching the parent's data at all; the
        // person's next visit (a real remount) picks up the saved values
        // from `todayLog` normally.
        setAutosaveStatus("saved");
      } catch {
        // Autosave failing silently in the background (vs. a toast) is
        // intentional here — a toast firing every ~2s of typing would be
        // noisy. The status line below is the honest signal instead; if it
        // never reaches "Saved", that's visible without being intrusive.
        // The explicit Save button remains the reliable, always-toasted
        // path if someone notices autosave isn't landing.
        setAutosaveStatus("idle");
      }
    },
    2000
  );

  useEffect(() => {
    if (!hasEditedRef.current) return;
    setAutosaveStatus("saving");
    debouncedAutosave({ learned, mistakes, wins, tomorrowGoal, dayJobHours });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learned, mistakes, wins, tomorrowGoal, dayJobHours]);

  function markEdited() {
    hasEditedRef.current = true;
  }

  return (
    <FadeUp>
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookMarked className="h-4 w-4" /> Today
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-accent" /> What did you learn?
          </Label>
          <Textarea
            value={learned}
            onChange={(e) => {
              markEdited();
              setLearned(e.target.value);
            }}
            placeholder="The concept, pattern, or technique that clicked today…"
            rows={2}
          />
        </div>
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Any mistakes or sticking points?
          </Label>
          <Textarea
            value={mistakes}
            onChange={(e) => {
              markEdited();
              setMistakes(e.target.value);
            }}
            placeholder="Where did you get stuck, or what would you do differently?"
            rows={2}
          />
        </div>
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-success" /> Wins
          </Label>
          <Textarea
            value={wins}
            onChange={(e) => {
              markEdited();
              setWins(e.target.value);
            }}
            placeholder="What went well, even small stuff?"
            rows={2}
          />
        </div>
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5">
            <Target className="h-3.5 w-3.5 text-accent" /> Tomorrow&apos;s goal
          </Label>
          <Textarea
            value={tomorrowGoal}
            onChange={(e) => {
              markEdited();
              setTomorrowGoal(e.target.value);
            }}
            placeholder="One concrete thing to pick up tomorrow…"
            rows={2}
          />
        </div>
        <div>
          <Label className="mb-1.5 flex items-center gap-1.5">
            Day job hours <span className="text-muted font-normal">(optional)</span>
          </Label>
          <Input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={dayJobHours}
            onChange={(e) => {
              markEdited();
              setDayJobHours(e.target.value);
            }}
            placeholder="e.g. 8"
            className="max-w-[120px]"
          />
          <p className="text-[11px] text-muted mt-1">
            Only used to protect the day job's stability alongside the engineering sprint — never required.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="self-start">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save entry
          </Button>
          {autosaveStatus === "saving" && (
            <span className="text-xs text-muted flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Autosaving…
            </span>
          )}
          {autosaveStatus === "saved" && !saving && (
            <span className="text-xs text-muted">Autosaved</span>
          )}
        </div>
      </CardContent>
    </Card>
    </FadeUp>
  );
}

export default function JournalPage() {
  const { user } = useUser();
  const { data: logs, isLoading, mutate } = useDailyLogs(user?.id);
  const { phases } = usePhasesWithProgress(user?.id);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const today = todayISO();
  const todayLog = useMemo(() => (logs ?? []).find((l) => l.date === today), [logs, today]);

  // This week's window: Monday of the current week through today, matching
  // weeklyBreakdown's Monday-anchored bucketing elsewhere in the app (see
  // use-daily-logs.ts) so "this week" means the same thing everywhere.
  const weekStartISO = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    return localDateISO(monday);
  }, []);

  const weeklyDigest = useMemo(() => {
    const weekLogs = (logs ?? []).filter((l) => l.date >= weekStartISO);
    const hoursThisWeek = weekLogs.reduce((sum, l) => sum + Number(l.hours), 0);
    const daysLoggedThisWeek = weekLogs.filter((l) => l.hours > 0).length;

    const allTopics = phases.flatMap((p) => p.topics);
    const completedThisWeek = allTopics.filter(
      (t) => t.progress?.completed && t.progress.completed_at && t.progress.completed_at.slice(0, 10) >= weekStartISO
    );

    // "Next up" — same phase -> stage -> topic walk order Daily Mission
    // uses, just the title of whatever's first incomplete, so the digest
    // can end on "here's what's next" without duplicating that whole
    // candidates/sort logic (a short flatMap+find here is fine since the
    // digest only needs the first one, unlike Daily Mission's memo).
    const nextTopic = phases
      .flatMap((p) => (p.stages ?? []).flatMap((s) => s.topics))
      .find((t) => !t.progress?.completed);

    return { hoursThisWeek, daysLoggedThisWeek, completedThisWeek, nextTopic };
  }, [logs, phases, weekStartISO]);

  const hasAnyDataThisWeek = weeklyDigest.hoursThisWeek > 0 || weeklyDigest.completedThisWeek.length > 0;


  const pastEntries = useMemo(
    () =>
      (logs ?? [])
        .filter((l) => l.date !== today && (l.learned || l.mistakes || l.wins || l.tomorrow_goal))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [logs, today]
  );

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Journal</h1>
        <p className="text-sm text-muted mt-1">
          A few minutes of reflection compounds — what you learned, where you slipped, what went right.
        </p>
      </div>
      </FadeUp>

      {user && (
        <TodayForm userId={user.id} todayLog={todayLog} onSaved={mutate} key={todayLog?.updated_at ?? "new"} />
      )}

      {hasAnyDataThisWeek && (
        <Card className="glow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-accent" />
              <CardTitle>This week</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-card border border-border bg-surface-2 p-3">
                <p className="text-xs text-muted mb-1">Hours logged</p>
                <p className="text-lg font-bold font-mono-tabular text-accent">
                  {formatHours(weeklyDigest.hoursThisWeek)}
                </p>
              </div>
              <div className="rounded-card border border-border bg-surface-2 p-3">
                <p className="text-xs text-muted mb-1">Days studied</p>
                <p className="text-lg font-bold font-mono-tabular text-accent">
                  {weeklyDigest.daysLoggedThisWeek} / 7
                </p>
              </div>
              <div className="rounded-card border border-border bg-surface-2 p-3">
                <p className="text-xs text-muted mb-1">Topics completed</p>
                <p className="text-lg font-bold font-mono-tabular text-accent">
                  {weeklyDigest.completedThisWeek.length}
                </p>
              </div>
            </div>

            {weeklyDigest.completedThisWeek.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1.5">Finished this week</p>
                <div className="flex flex-wrap gap-1.5">
                  {weeklyDigest.completedThisWeek.map((t) => (
                    <span key={t.id} className="text-xs rounded-full bg-accent/10 text-accent px-2.5 py-1">
                      {t.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {weeklyDigest.nextTopic && (
              <p className="text-sm text-muted">
                Next up: <span className="text-foreground font-medium">{weeklyDigest.nextTopic.title}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {pastEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past entries</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {pastEntries.map((log) => {
              const expanded = expandedDate === log.date;
              return (
                <div key={log.date} className="py-3 first:pt-0 last:pb-0">
                  <button
                    onClick={() => setExpandedDate(expanded ? null : log.date)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="text-sm font-medium font-mono-tabular">
                      {new Date(log.date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && (
                    <div className="mt-2 flex flex-col gap-2 text-sm">
                      {log.learned && (
                        <p>
                          <span className="text-accent font-medium">Learned: </span>
                          {log.learned}
                        </p>
                      )}
                      {log.mistakes && (
                        <p>
                          <span className="text-warning font-medium">Mistakes: </span>
                          {log.mistakes}
                        </p>
                      )}
                      {log.wins && (
                        <p>
                          <span className="text-success font-medium">Wins: </span>
                          {log.wins}
                        </p>
                      )}
                      {log.tomorrow_goal && (
                        <p>
                          <span className="text-accent font-medium">Next: </span>
                          {log.tomorrow_goal}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
