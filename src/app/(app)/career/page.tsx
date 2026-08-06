"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useCareerTracker, upsertCareerEntry, deleteCareerEntry, APPLICATION_STATUSES } from "@/lib/hooks/use-career";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Briefcase, TrendingUp, CircleCheckBig } from "lucide-react";
import type { ApplicationStatus, CareerTrackerRow } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_VARIANT: Record<ApplicationStatus, "default" | "warning" | "success" | "danger" | "accent" | "outline"> = {
  wishlist: "outline",
  applied: "default",
  screening: "warning",
  interviewing: "accent",
  offer: "success",
  rejected: "danger",
  withdrawn: "outline",
};

export default function CareerTrackerPage() {
  const { user } = useUser();
  const { data: entries, mutate, isLoading } = useCareerTracker(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CareerTrackerRow> | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing({ company: "", application_status: "wishlist", offer: false });
    setDialogOpen(true);
  }

  function openEdit(entry: CareerTrackerRow) {
    setEditing(entry);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!user || !editing?.company?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      await upsertCareerEntry(user.id, editing as CareerTrackerRow & { company: string });
      await mutate();
      setDialogOpen(false);
      toast.success("Saved");
    } catch {
      toast.error("Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCareerEntry(id);
      await mutate();
      setDialogOpen(false);
    } catch {
      toast.error("Couldn't delete.");
    }
  }

  const counts = APPLICATION_STATUSES.map((s) => ({
    ...s,
    count: (entries ?? []).filter((e) => e.application_status === s.value).length,
  }));

  // Derived from the same entries list already fetched — no new data
  // source, no fabricated "readiness score." Just the two numbers a
  // returning user actually wants at a glance: how much is in flight, and
  // how many offers are on the table.
  const activeCount = (entries ?? []).filter((e) =>
    ["applied", "screening", "interviewing"].includes(e.application_status)
  ).length;
  const offerCount = (entries ?? []).filter((e) => e.offer).length;
  const totalCount = (entries ?? []).length;

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-semibold tracking-tight">Career Tracker</h1>
          <p className="text-sm text-muted mt-1">Applications, interviews, offers — one source of truth.</p>
        </div>
        <Button onClick={openNew} size="lg">
          <Plus className="h-4 w-4" /> Add application
        </Button>
      </div>

      {/* Summary strip — real counts from the same data as the status
          breakdown below, just surfaced at a glance before the per-status
          detail. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Briefcase className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Total applications</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15 text-highlight">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Active pipeline</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className={offerCount > 0 ? "border-success/30" : undefined}>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success">
                <CircleCheckBig className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Offers</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none">{offerCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {counts.map((c) => (
          <Card key={c.value}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-lg font-bold font-mono-tabular">{c.count}</p>
              <p className="text-[11px] text-muted">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {(entries ?? []).map((entry) => (
          <button
            key={entry.id}
            onClick={() => openEdit(entry)}
            className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition-standard hover:bg-surface-hover hover:border-muted-2/40 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.company}</p>
              {entry.role && <p className="text-xs text-muted truncate mt-0.5">{entry.role}</p>}
            </div>
            <Badge variant={STATUS_VARIANT[entry.application_status]}>{entry.application_status}</Badge>
            {entry.offer && <Badge variant="success">Offer</Badge>}
            {entry.interview_date && (
              <span className="text-xs text-muted font-mono-tabular hidden sm:inline">
                {new Date(entry.interview_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
          </button>
        ))}
        {(entries ?? []).length === 0 && (
          <EmptyState message="No applications yet." hint="Add your first one." />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit application" : "New application"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Company</Label>
                <Input
                  className="mt-1"
                  value={editing.company ?? ""}
                  onChange={(e) => setEditing({ ...editing, company: e.target.value })}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Input
                  className="mt-1"
                  value={editing.role ?? ""}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing.application_status ?? "wishlist"}
                    onValueChange={(v) => setEditing({ ...editing, application_status: v as ApplicationStatus })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Interview date</Label>
                  <Input
                    className="mt-1"
                    type="date"
                    value={editing.interview_date?.slice(0, 10) ?? ""}
                    onChange={(e) => setEditing({ ...editing, interview_date: e.target.value || null })}
                  />
                </div>
              </div>
              <div>
                <Label>Resume version</Label>
                <Input
                  className="mt-1"
                  value={editing.resume_version ?? ""}
                  onChange={(e) => setEditing({ ...editing, resume_version: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <DialogFooter className="justify-between">
                {editing.id ? (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(editing.id!)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                ) : (
                  <span />
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
