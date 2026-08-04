"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useCareerTracker, upsertCareerEntry } from "@/lib/hooks/use-career";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import type { CareerTrackerRow } from "@/types/database";

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

export default function InterviewsPage() {
  const { user } = useUser();
  const { data: entries, mutate, isLoading } = useCareerTracker(user?.id);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

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

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Interview Tracker</h1>
        <p className="text-sm text-muted">
          Scheduled interviews from your Career Tracker, sorted by date. Prep notes live here.
        </p>
      </div>

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
        <div className="flex flex-col gap-3">
          {upcoming.map((entry) => {
            const days = daysUntil(entry.interview_date);
            return (
              <Card key={entry.id} className={days <= 2 ? "border-warning/50" : undefined}>
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
                <CardContent className="flex flex-col gap-2">
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
            );
          })}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted mb-2">Past ({past.length})</h2>
          <div className="flex flex-col gap-1">
            {past.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.company}</p>
                  {entry.role && <p className="text-xs text-muted truncate">{entry.role}</p>}
                </div>
                <Badge variant="outline">{entry.application_status}</Badge>
                <span className="text-xs text-muted font-mono-tabular hidden sm:inline">
                  {new Date(entry.interview_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
