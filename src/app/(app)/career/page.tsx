"use client";

import { useState, useMemo } from "react";
import { useUser } from "@/lib/hooks/use-user";
import {
  useCareerTracker,
  useApplicationMetrics,
  useApplicationMetricsByPlan,
  upsertCareerEntry,
  deleteCareerEntry,
  APPLICATION_STATUSES,
} from "@/lib/hooks/use-career";
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
import { Plus, Trash2, Loader2, Briefcase, TrendingUp, CircleCheckBig, Link as LinkIcon, MapPin, IndianRupee } from "lucide-react";
import type { ApplicationStatus, CareerTrackerRow } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getStaleApplications } from "@/lib/plan-position";
import { StaggerContainer, StaggerItem, FadeUp } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";

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
  const staleApplications = useMemo(() => getStaleApplications(entries ?? []), [entries]);
  const { data: metrics } = useApplicationMetrics(user?.id);
  const { data: planMetrics } = useApplicationMetricsByPlan(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CareerTrackerRow> | null>(null);
  const [originalEntry, setOriginalEntry] = useState<CareerTrackerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState("");

  function openNew() {
    setEditing({ company: "", application_status: "wishlist", offer: false, tech_stack: [] });
    setOriginalEntry(null);
    setTechInput("");
    setDialogOpen(true);
  }

  function openEdit(entry: CareerTrackerRow) {
    setEditing(entry);
    setOriginalEntry(entry);
    setTechInput((entry.tech_stack ?? []).join(", "));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!user || !editing?.company?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const tech_stack = techInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await upsertCareerEntry(
        user.id,
        { ...editing, tech_stack } as CareerTrackerRow & { company: string },
        originalEntry ?? undefined
      );
      await mutate();
      setDialogOpen(false);
      toast.success("Saved");
    } catch {
      toast.error("Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: CareerTrackerRow) {
    if (!user) return;
    try {
      await deleteCareerEntry(user.id, entry);
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

  const activeCount = (entries ?? []).filter((e) =>
    ["applied", "screening", "interviewing"].includes(e.application_status)
  ).length;
  const offerCount = (entries ?? []).filter((e) => e.offer).length;
  const totalCount = (entries ?? []).length;

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-semibold tracking-tight">Career Tracker</h1>
          <p className="text-sm text-muted mt-1">Applications, interviews, offers — one source of truth.</p>
        </div>
        <Button onClick={openNew} size="lg">
          <Plus className="h-4 w-4" /> Add application
        </Button>
      </div>
      </FadeUp>

      {staleApplications.length > 0 && (
        <FadeUp>
          <div className="rounded-card border border-warning/30 bg-warning/5 p-3 flex flex-col gap-1.5">
            <p className="text-xs font-medium text-warning">
              {staleApplications.length} application{staleApplications.length === 1 ? "" : "s"} with no update in 10+ days
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {staleApplications.slice(0, 5).map((a) => (
                <span key={a.id}>
                  {a.company}
                  {a.role ? ` — ${a.role}` : ""} ({a.daysSinceApplied}d)
                </span>
              ))}
              {staleApplications.length > 5 && <span>+{staleApplications.length - 5} more</span>}
            </div>
          </div>
        </FadeUp>
      )}

      <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glow-card">
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Briefcase className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Total applications</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none"><AnimatedCounter value={totalCount} /></p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15 text-highlight">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Active pipeline</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none"><AnimatedCounter value={activeCount} /></p>
          </CardContent>
        </Card>
        <Card className={cn("glow-card", offerCount > 0 && "border-success/30")}>
          <CardContent noHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success">
                <CircleCheckBig className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs text-muted">Offers</p>
            </div>
            <p className="text-3xl font-bold font-mono-tabular leading-none"><AnimatedCounter value={offerCount} /></p>
          </CardContent>
        </Card>
      </div>
      </StaggerItem>

      <StaggerItem>
      {/* Response/interview/offer/rejection rates — computed live in the DB
          from career_tracker rows (application_metrics view), never a
          hardcoded/cached number. Only shown once there's at least one
          non-wishlist application, since a 0% rate on zero data is noise. */}
      {metrics && metrics.total_applications - counts.find((c) => c.value === "wishlist")!.count > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <RateStat label="Response rate" value={metrics.response_rate_pct} />
          <RateStat label="Interview rate" value={metrics.interview_rate_pct} />
          <RateStat label="Offer rate" value={metrics.offer_rate_pct} />
          <RateStat label="Rejection rate" value={metrics.rejection_rate_pct} />
        </div>
      )}
      </StaggerItem>

      {planMetrics && planMetrics.length > 0 && (
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["plan_b", "plan_a"] as const).map((plan) => {
              const m = planMetrics.find((p) => p.career_plan === plan);
              const label = plan === "plan_b" ? "Plan B — SDE Sprint" : "Plan A — Operations Fallback";
              return (
                <Card key={plan} className={cn(plan === "plan_a" && "border-info/30")}>
                  <CardContent noHeader className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono uppercase tracking-wide text-muted">{label}</p>
                      {plan === "plan_b" && <Badge variant="accent">Active</Badge>}
                      {plan === "plan_a" && <Badge variant="outline">Fallback</Badge>}
                    </div>
                    {m ? (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-semibold font-mono-tabular">{m.total_applications}</p>
                          <p className="text-[10px] text-muted">Applications</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold font-mono-tabular">{m.reached_interview_count}</p>
                          <p className="text-[10px] text-muted">Interviews</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold font-mono-tabular">{m.offer_count}</p>
                          <p className="text-[10px] text-muted">Offers</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">No applications tagged to this plan yet.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </StaggerItem>
      )}


      <StaggerItem>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {counts.map((c) => (
          <Card key={c.value} className="glow-card">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-lg font-bold font-mono-tabular">{c.count}</p>
              <p className="text-[11px] text-muted">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      </StaggerItem>

      <StaggerItem>
      <div className="flex flex-col gap-2">
        {(entries ?? []).map((entry) => (
          <button
            key={entry.id}
            onClick={() => openEdit(entry)}
            className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition-standard hover:bg-surface-hover hover:border-muted-2/40 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20 glow-card"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.company}</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {entry.role && <p className="text-xs text-muted truncate">{entry.role}</p>}
                {entry.location && (
                  <span className="text-xs text-muted flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" /> {entry.location}
                  </span>
                )}
                {entry.salary_range && (
                  <span className="text-xs text-muted flex items-center gap-0.5">
                    <IndianRupee className="h-2.5 w-2.5" /> {entry.salary_range}
                  </span>
                )}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[entry.application_status]}>{entry.application_status}</Badge>
            {entry.career_plan === "plan_a" && (
              <Badge variant="outline" className="text-[10px]">
                Plan A
              </Badge>
            )}
            {entry.offer && <Badge variant="success">Offer</Badge>}
            {entry.follow_up_date && (
              <span className="text-xs text-warning font-mono-tabular hidden sm:inline">
                follow up {new Date(entry.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            )}
          </button>
        ))}
        {(entries ?? []).length === 0 && (
          <EmptyState message="No applications yet." hint="Add your first one." />
        )}
      </div>
      </StaggerItem>
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit application" : "New application"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Source</Label>
                  <Input
                    className="mt-1"
                    placeholder="Referral, LinkedIn, cold apply…"
                    value={editing.source ?? ""}
                    onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Career plan</Label>
                <Select
                  value={editing.career_plan ?? "plan_b"}
                  onValueChange={(v) => setEditing({ ...editing, career_plan: v as "plan_a" | "plan_b" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_b">Plan B — SDE Sprint</SelectItem>
                    <SelectItem value="plan_a">Plan A — Operations Fallback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Job URL</Label>
                <Input
                  className="mt-1"
                  placeholder="https://…"
                  value={editing.job_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, job_url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input
                    className="mt-1"
                    value={editing.location ?? ""}
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Salary range</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. 8-12 LPA"
                    value={editing.salary_range ?? ""}
                    onChange={(e) => setEditing({ ...editing, salary_range: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Tech stack (comma separated)</Label>
                <Input
                  className="mt-1"
                  placeholder="React, Node.js, PostgreSQL"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Recruiter name</Label>
                  <Input
                    className="mt-1"
                    value={editing.recruiter_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, recruiter_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Recruiter contact</Label>
                  <Input
                    className="mt-1"
                    value={editing.recruiter_contact ?? ""}
                    onChange={(e) => setEditing({ ...editing, recruiter_contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Next interview date</Label>
                  <Input
                    className="mt-1"
                    type="date"
                    value={editing.interview_date?.slice(0, 10) ?? ""}
                    onChange={(e) => setEditing({ ...editing, interview_date: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label>Follow-up date</Label>
                  <Input
                    className="mt-1"
                    type="date"
                    value={editing.follow_up_date?.slice(0, 10) ?? ""}
                    onChange={(e) => setEditing({ ...editing, follow_up_date: e.target.value || null })}
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

              {editing.application_status === "rejected" && (
                <div>
                  <Label>Rejection reason</Label>
                  <Input
                    className="mt-1"
                    value={editing.rejection_reason ?? ""}
                    onChange={(e) => setEditing({ ...editing, rejection_reason: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label>Job description</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={editing.job_description ?? ""}
                  onChange={(e) => setEditing({ ...editing, job_description: e.target.value })}
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
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(editing as CareerTrackerRow)}>
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

function RateStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent noHeader className="pt-3 pb-3">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-xl font-bold font-mono-tabular mt-0.5">{value}%</p>
      </CardContent>
    </Card>
  );
}
