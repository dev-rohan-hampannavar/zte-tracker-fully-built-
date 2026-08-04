"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { useCareerTracker, upsertCareerEntry, deleteCareerEntry, APPLICATION_STATUSES } from "@/lib/hooks/use-career";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { ApplicationStatus, CareerTrackerRow } from "@/types/database";

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

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Career Tracker</h1>
          <p className="text-sm text-muted">Applications, interviews, offers — one source of truth.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Add application
        </Button>
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

      <div className="flex flex-col gap-1">
        {(entries ?? []).map((entry) => (
          <button
            key={entry.id}
            onClick={() => openEdit(entry)}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left hover:bg-surface-2 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.company}</p>
              {entry.role && <p className="text-xs text-muted truncate">{entry.role}</p>}
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
          <p className="text-sm text-muted text-center py-8">No applications tracked yet. Add your first one.</p>
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
