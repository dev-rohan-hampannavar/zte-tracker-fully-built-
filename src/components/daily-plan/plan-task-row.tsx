"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Play, Check, X, Undo2, Loader2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/motion/primitives";
import type { PlanTask, PlanTaskKind } from "@/lib/daily-planner";
import type { DailyPlanTaskState } from "@/types/database";
import {
  planTaskKey,
  markDailyPlanTaskStarted,
  markDailyPlanTaskSkipped,
  completeDailyPlanTask,
  resetDailyPlanTask,
} from "@/lib/hooks/use-daily-plan-task-state";
import { startFocusSession } from "@/lib/hooks/use-focus-session";
import { todayISO, cn } from "@/lib/utils";

interface PlanTaskRowProps {
  task: PlanTask;
  icon: typeof Play;
  kindLabel: Record<PlanTaskKind, string>;
  userId: string | undefined;
  state: DailyPlanTaskState | undefined;
  planDate: string;
  onStateChange: () => Promise<unknown>;
  onFocusStarted: () => Promise<unknown>;
}

/**
 * One row in the daily plan list. A PlanTask has no database identity of
 * its own (see PlanTask.naturalKey) — this component is what joins it,
 * via task_key, to its optional daily_plan_task_state row so the same
 * task shows as done/skipped/in-progress across reloads and regenerations
 * of the plan for the same day.
 *
 * "Start" begins a real focus_sessions timer (when the task links to a
 * topic/project/activity) so time actually gets tracked through the
 * existing focus-session → study_sessions → daily_logs pipeline, rather
 * than this table inventing a second, disconnected notion of "in
 * progress." Tasks with no linkable activity (e.g. a goal-deadline nudge)
 * can still be marked done/skipped directly with no timer.
 */
export function PlanTaskRow({ task, icon: Icon, kindLabel, userId, state, planDate, onStateChange, onFocusStarted }: PlanTaskRowProps) {
  const [busy, setBusy] = useState(false);
  const status = state?.status ?? "pending";
  const isDone = status === "completed";
  const isSkipped = status === "skipped";
  const isInProgress = status === "in_progress";
  const carried = !!state?.carried_from_date;

  async function handleStart() {
    if (!userId || !task.activity) return;
    setBusy(true);
    try {
      await startFocusSession(userId, {
        mode: "pomodoro",
        activity: task.activity,
        topicId: task.topicId,
        stageProjectId: task.stageProjectId,
        planTaskKey: planTaskKey(task),
      });
      // Without this, the plan row stays "pending" while a real timer is
      // running against it — the exact task-state/timer-state desync the
      // spec calls out (P0: "make timer state and task state
      // consistent"). markDailyPlanTaskStarted is a plain status write
      // (no time-tracking side effect of its own), so this can't
      // double-count anything; the actual minutes still only ever come
      // from completeDailyPlanTask/complete_focus_session.
      await markDailyPlanTaskStarted(userId, planDate, task);
      await onFocusStarted();
      await onStateChange();
      toast.success("Focus session started — see the timer on your dashboard.");
    } catch {
      toast.error("Couldn't start a focus session.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    try {
      await completeDailyPlanTask(planDate, task);
      await onStateChange();
    } catch {
      toast.error("Couldn't mark this done.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    if (!userId) return;
    setBusy(true);
    try {
      await markDailyPlanTaskSkipped(userId, planDate, task);
      await onStateChange();
    } catch {
      toast.error("Couldn't skip this.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!userId) return;
    setBusy(true);
    try {
      await resetDailyPlanTask(userId, planDate, planTaskKey(task));
      await onStateChange();
    } catch {
      toast.error("Couldn't undo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaggerItem>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-standard glow-card",
          isDone && "opacity-60",
          isSkipped && "opacity-40"
        )}
      >
        <Icon className="h-4 w-4 text-muted shrink-0" />
        <Link href={task.href} className="flex-1 min-w-0 hover:underline decoration-muted-2/40">
          <p className={cn("text-sm font-medium truncate", isDone && "line-through")}>{task.title}</p>
          <p className="text-xs text-muted truncate">{task.reason}</p>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {carried && planDate === todayISO() && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <History className="h-2.5 w-2.5" /> Carried
            </Badge>
          )}
          {isInProgress && (
            <Badge variant="accent" className="text-[10px]">
              In progress
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {kindLabel[task.kind]}
          </Badge>
          <span className="text-xs text-muted font-mono-tabular">{task.estimatedMinutes}m</span>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
          ) : isDone || isSkipped ? (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUndo} title="Undo">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <>
              {task.activity && !isInProgress && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleStart} title="Start a focus session">
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleComplete} title="Mark done">
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted" onClick={handleSkip} title="Skip today">
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </StaggerItem>
  );
}
