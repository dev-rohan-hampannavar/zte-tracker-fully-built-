"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import {
  useGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  completeMilestone,
  setMilestoneStatus,
  GOAL_PRIORITIES,
} from "@/lib/hooks/use-goals";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Target, ChevronDown, ChevronRight, Flag, CircleCheckBig, CalendarClock } from "lucide-react";
import type { Goal, GoalPriority, GoalWithMilestones, Milestone } from "@/types/database";
import { cn } from "@/lib/utils";
import { StaggerContainer, StaggerItem, FadeUp } from "@/components/motion/primitives";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { motion, AnimatePresence } from "framer-motion";

// Isolates the one impure call (Date.now()) behind a plain function so the
// react-compiler purity lint doesn't flag it during render.
function now(): number {
  return Date.now();
}

const PRIORITY_VARIANT: Record<GoalPriority, "default" | "warning" | "success" | "danger" | "accent" | "outline"> = {
  low: "outline",
  medium: "default",
  high: "warning",
  critical: "danger",
};

export default function GoalsPage() {
  const { user } = useUser();
  const { data: goals, mutate, isLoading } = useGoals(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [milestoneDraft, setMilestoneDraft] = useState<Record<string, string>>({});
  const [addingMilestone, setAddingMilestone] = useState<string | null>(null);

  function openNew() {
    setEditing({ title: "", priority: "medium", status: "active" });
    setDialogOpen(true);
  }

  function openEdit(g: Goal) {
    setEditing(g);
    setDialogOpen(true);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!user || !editing?.title?.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await updateGoal(editing.id, editing);
      } else {
        await createGoal(user.id, {
          title: editing.title,
          description: editing.description ?? undefined,
          category: editing.category ?? undefined,
          priority: editing.priority ?? "medium",
          target_date: editing.target_date ?? null,
        });
      }
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
      await deleteGoal(id);
      await mutate();
      setDialogOpen(false);
      toast.success("Goal deleted");
    } catch {
      toast.error("Couldn't delete.");
    }
  }

  async function handleAddMilestone(goalId: string) {
    const title = milestoneDraft[goalId]?.trim();
    if (!user || !title) return;
    setAddingMilestone(goalId);
    try {
      await createMilestone(user.id, goalId, { title });
      setMilestoneDraft((d) => ({ ...d, [goalId]: "" }));
      await mutate();
    } catch {
      toast.error("Couldn't add milestone.");
    } finally {
      setAddingMilestone(null);
    }
  }

  async function handleToggleMilestone(m: Milestone) {
    if (!user) return;
    try {
      if (m.status === "completed") {
        await setMilestoneStatus(m.id, "not_started");
      } else {
        await completeMilestone(user.id, m);
      }
      await mutate();
    } catch {
      toast.error("Couldn't update milestone.");
    }
  }

  async function handleDeleteMilestone(id: string) {
    try {
      await deleteMilestone(id);
      await mutate();
    } catch {
      toast.error("Couldn't delete milestone.");
    }
  }

  async function handleEditMilestone(id: string, patch: Partial<Milestone>) {
    try {
      await updateMilestone(id, patch);
      await mutate();
    } catch {
      toast.error("Couldn't save milestone.");
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const activeGoals = (goals ?? []).filter((g) => g.status === "active");
  const otherGoals = (goals ?? []).filter((g) => g.status !== "active");
  const completedGoals = (goals ?? []).filter((g) => g.status === "completed");
  const atRiskCount = activeGoals.filter(
    (g) => g.target_date && new Date(g.target_date).getTime() - now() < 7 * 86400000
  ).length;
  const overallCompletion =
    activeGoals.length === 0 ? 0 : Math.round(activeGoals.reduce((s, g) => s + g.progress_pct, 0) / activeGoals.length);

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title font-semibold tracking-tight">Goals</h1>
            <p className="text-sm text-muted mt-1">
              Goal → milestones → daily execution. Progress here is always computed live from milestone completion.
            </p>
          </div>
          <Button onClick={openNew} size="lg">
            <Plus className="h-4 w-4" /> New goal
          </Button>
        </div>
      </FadeUp>

      {(goals ?? []).length > 0 && (
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StaggerItem>
            <Card className="glow-card h-full">
              <CardContent noHeader>
                <p className="text-xs text-muted mb-1">Active</p>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={activeGoals.length} /></p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className={cn("glow-card h-full", atRiskCount > 0 && "border-warning/40")}>
              <CardContent noHeader>
                <p className="text-xs text-muted mb-1">Due within 7 days</p>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={atRiskCount} /></p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="glow-card h-full">
              <CardContent noHeader>
                <p className="text-xs text-muted mb-1">Avg. completion</p>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={overallCompletion} suffix="%" /></p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="glow-card h-full">
              <CardContent noHeader>
                <p className="text-xs text-muted mb-1">Completed all-time</p>
                <p className="text-2xl font-bold font-mono-tabular"><AnimatedCounter value={completedGoals.length} /></p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>
      )}

      <StaggerContainer className="flex flex-col gap-4">
        {activeGoals.map((g) => (
          <StaggerItem key={g.id}>
            <GoalCard
              goal={g}
              expanded={expanded.has(g.id)}
              onToggleExpanded={() => toggleExpanded(g.id)}
              onEdit={() => openEdit(g)}
              draft={milestoneDraft[g.id] ?? ""}
              onDraftChange={(v) => setMilestoneDraft((d) => ({ ...d, [g.id]: v }))}
              onAddMilestone={() => handleAddMilestone(g.id)}
              addingMilestone={addingMilestone === g.id}
              onToggleMilestone={handleToggleMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onEditMilestone={handleEditMilestone}
            />
          </StaggerItem>
        ))}

        {activeGoals.length === 0 && (
          <EmptyState message="No active goals yet." hint="Create your first goal to start tracking milestones." />
        )}

        {otherGoals.length > 0 && (
          <>
            <p className="text-xs text-muted uppercase tracking-wide mt-2">Paused / completed / abandoned</p>
            {otherGoals.map((g) => (
              <StaggerItem key={g.id}>
                <GoalCard
                  goal={g}
                  expanded={expanded.has(g.id)}
                  onToggleExpanded={() => toggleExpanded(g.id)}
                  onEdit={() => openEdit(g)}
                  draft={milestoneDraft[g.id] ?? ""}
                  onDraftChange={(v) => setMilestoneDraft((d) => ({ ...d, [g.id]: v }))}
                  onAddMilestone={() => handleAddMilestone(g.id)}
                  addingMilestone={addingMilestone === g.id}
                  onToggleMilestone={handleToggleMilestone}
                  onDeleteMilestone={handleDeleteMilestone}
                  onEditMilestone={handleEditMilestone}
                  muted
                />
              </StaggerItem>
            ))}
          </>
        )}
      </StaggerContainer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit goal" : "New goal"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Become a React Developer"
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Career"
                    value={editing.category ?? ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={editing.priority ?? "medium"}
                    onValueChange={(v) => setEditing({ ...editing, priority: v as GoalPriority })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Target date</Label>
                  <Input
                    className="mt-1"
                    type="date"
                    value={editing.target_date?.slice(0, 10) ?? ""}
                    onChange={(e) => setEditing({ ...editing, target_date: e.target.value || null })}
                  />
                </div>
                {editing.id && (
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editing.status ?? "active"}
                      onValueChange={(v) => setEditing({ ...editing, status: v as Goal["status"] })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="abandoned">Abandoned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

function GoalCard({
  goal,
  expanded,
  onToggleExpanded,
  onEdit,
  draft,
  onDraftChange,
  onAddMilestone,
  addingMilestone,
  onToggleMilestone,
  onDeleteMilestone,
  onEditMilestone,
  muted,
}: {
  goal: GoalWithMilestones;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  draft: string;
  onDraftChange: (v: string) => void;
  onAddMilestone: () => void;
  addingMilestone: boolean;
  onToggleMilestone: (m: Milestone) => void;
  onDeleteMilestone: (id: string) => void;
  onEditMilestone: (id: string, patch: Partial<Milestone>) => void;
  muted?: boolean;
}) {
  return (
    <Card className={cn(muted && "opacity-70", !muted && "glow-card")}>
      <CardContent noHeader className="pt-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggleExpanded}
            className="mt-0.5 text-muted hover:text-foreground transition-standard"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Target className="h-3.5 w-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={onEdit} className="text-sm font-medium text-left hover:underline">
                {goal.title}
              </button>
              <Badge variant={PRIORITY_VARIANT[goal.priority]}>{goal.priority}</Badge>
              {goal.status !== "active" && <Badge variant="outline">{goal.status}</Badge>}
              {goal.target_date && (
                <span className="text-xs text-muted font-mono-tabular">
                  due {new Date(goal.target_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
            {goal.description && <p className="text-xs text-muted mt-1">{goal.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <Progress value={goal.progress_pct} className="h-1.5 flex-1 max-w-xs" glow={goal.progress_pct >= 75} />
              <span className="text-xs text-muted font-mono-tabular">
                {goal.milestones.filter((m) => m.status === "completed").length}/{goal.milestones.length} · {goal.progress_pct}%
              </span>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 ml-10 flex flex-col gap-2">
            {goal.milestones
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  onToggle={() => onToggleMilestone(m)}
                  onDelete={() => onDeleteMilestone(m.id)}
                  onEdit={(patch) => onEditMilestone(m.id, patch)}
                />
              ))}
            {goal.milestones.length === 0 && (
              <p className="text-xs text-muted flex items-center gap-1.5">
                <Flag className="h-3 w-3" /> No milestones yet.
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Input
                placeholder="Add a milestone…"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAddMilestone();
                }}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={onAddMilestone} disabled={addingMilestone || !draft.trim()}>
                {addingMilestone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneRow({
  milestone,
  onToggle,
  onDelete,
  onEdit,
}: {
  milestone: Milestone;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (patch: Partial<Milestone>) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(milestone.title);
  const [editingDeadline, setEditingDeadline] = useState(false);

  function commitTitle() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (trimmed && trimmed !== milestone.title) onEdit({ title: trimmed });
    else setTitleDraft(milestone.title);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 group">
      <Checkbox checked={milestone.status === "completed"} onCheckedChange={onToggle} />

      {editingTitle ? (
        <Input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") {
              setTitleDraft(milestone.title);
              setEditingTitle(false);
            }
          }}
          className="h-6 flex-1 text-sm px-1.5"
        />
      ) : (
        <button
          onClick={() => setEditingTitle(true)}
          className={cn(
            "text-sm flex-1 text-left hover:text-accent transition-standard",
            milestone.status === "completed" && "line-through text-muted"
          )}
          title="Click to edit"
        >
          {milestone.title}
        </button>
      )}

      {editingDeadline ? (
        <Input
          autoFocus
          type="date"
          defaultValue={milestone.deadline?.slice(0, 10) ?? ""}
          onBlur={(e) => {
            setEditingDeadline(false);
            onEdit({ deadline: e.target.value || null });
          }}
          className="h-6 w-32 text-xs px-1.5"
        />
      ) : (
        <button
          onClick={() => setEditingDeadline(true)}
          className="text-xs text-muted font-mono-tabular hidden sm:flex items-center gap-1 hover:text-accent transition-standard shrink-0"
          title="Click to set deadline"
        >
          <CalendarClock className="h-3 w-3" />
          {milestone.deadline
            ? new Date(milestone.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            : "no date"}
        </button>
      )}

      <AnimatePresence mode="wait">
        {milestone.status === "completed" && (
          <motion.span
            key="check"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <CircleCheckBig className="h-3.5 w-3.5 text-success" />
          </motion.span>
        )}
      </AnimatePresence>
      <button
        onClick={onDelete}
        className="text-muted hover:text-danger transition-standard opacity-0 group-hover:opacity-100"
        aria-label="Delete milestone"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
