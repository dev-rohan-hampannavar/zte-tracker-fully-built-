"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useActivityLog, markActivityUndone, ACTIVITY_LABELS } from "@/lib/hooks/use-activity-log";
import { undoApplicationDelete, undoApplicationStatusChange } from "@/lib/hooks/use-career";
import { undoSkillRemove } from "@/lib/hooks/use-skills";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { History, Undo2, Loader2 } from "lucide-react";
import type { ActivityLogEntry, CareerTrackerRow, UserSkill, ApplicationStatus, ActivityAction } from "@/types/database";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function canUndo(entry: ActivityLogEntry): boolean {
  if (entry.undone || !entry.undo_payload) return false;
  return entry.action === "application_deleted" || entry.action === "application_status_changed" || entry.action === "skill_removed";
}

export default function ActivityHistoryPage() {
  const { user } = useUser();
  const { data: entries, mutate, isLoading } = useActivityLog(user?.id, 100);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityAction | "all">("all");

  async function handleUndo(entry: ActivityLogEntry) {
    setUndoing(entry.id);
    try {
      if (entry.action === "application_deleted") {
        await undoApplicationDelete(entry.undo_payload as unknown as CareerTrackerRow);
      } else if (entry.action === "application_status_changed") {
        const payload = entry.undo_payload as { field: string; value: ApplicationStatus };
        await undoApplicationStatusChange(entry.entity_id, payload.value);
      } else if (entry.action === "skill_removed") {
        await undoSkillRemove(entry.undo_payload as unknown as UserSkill);
      }
      await markActivityUndone(entry.id);
      await mutate();
      toast.success("Undone");
    } catch {
      toast.error("Couldn't undo — the underlying record may have changed since.");
    } finally {
      setUndoing(null);
    }
  }

  const actionsPresent = useMemo(() => {
    const set = new Set<ActivityAction>();
    for (const e of entries ?? []) set.add(e.action);
    return [...set];
  }, [entries]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries ?? [];
    return (entries ?? []).filter((e) => e.action === filter);
  }, [entries, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLogEntry[]>();
    for (const e of filtered) {
      const key = new Date(e.created_at).toDateString();
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-page-title font-semibold tracking-tight flex items-center gap-2">
              <History className="h-5 w-5" /> Activity History
            </h1>
            <p className="text-sm text-muted mt-1">
              Meaningful changes across goals, applications, skills, and interviews — with undo where it&apos;s safe.
            </p>
          </div>
          {actionsPresent.length > 1 && (
            <Select value={filter} onValueChange={(v) => setFilter(v as ActivityAction | "all")}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                {actionsPresent.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTIVITY_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </FadeUp>

      {grouped.length === 0 && (
        <EmptyState message="No activity yet." hint="Actions like completing a milestone or updating an application will show up here." />
      )}

      <StaggerContainer className="flex flex-col gap-4">
        {grouped.map(([dayKey, dayEntries]) => (
          <StaggerItem key={dayKey}>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-2">{dayLabel(dayEntries[0].created_at)}</p>
              <Card className="glow-card">
                <CardContent className="flex flex-col gap-1 py-2">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{entry.summary}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">
                            {ACTIVITY_LABELS[entry.action]}
                          </Badge>
                          <span className="text-xs text-muted">{timeAgo(entry.created_at)}</span>
                          {entry.undone && <span className="text-xs text-muted italic">undone</span>}
                        </div>
                      </div>
                      {canUndo(entry) && (
                        <Button size="sm" variant="ghost" onClick={() => handleUndo(entry)} disabled={undoing === entry.id}>
                          {undoing === entry.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Undo2 className="h-3.5 w-3.5" />
                          )}
                          Undo
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <p className="text-xs text-muted">
        Only a subset of actions can be undone here — deleting an application, changing an application&apos;s
        status, and removing a declared skill. Other actions (like completing a milestone) are logged for visibility
        but reversed by editing the item directly, since an automatic reversal wouldn&apos;t always be the safe or
        obvious choice.
      </p>
    </div>
  );
}
