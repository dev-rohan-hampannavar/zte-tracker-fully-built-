"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, Pause, Square, Loader2, Timer as TimerIcon, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  useActiveFocusSession,
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  completeFocusSession,
  discardFocusSession,
  FOCUS_ACTIVITY_LABELS,
  POMODORO_SECONDS,
} from "@/lib/hooks/use-focus-session";
import type { FocusSessionMode, StudySessionActivity } from "@/types/database";
import { cn } from "@/lib/utils";

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

interface FocusTimerProps {
  userId: string | undefined;
  onLogged?: () => Promise<unknown> | void;
}

/**
 * Live focus timer (stopwatch / countdown / Pomodoro). Elapsed time is
 * computed client-side from started_at/last_resumed_at + a local tick, not
 * polled from the server every second — the DB row only needs to persist
 * enough to survive a reload (mode, planned duration, accumulated elapsed
 * seconds as of the last pause). On completion, writes into study_sessions
 * via the same atomic path the manual "Log study time" dialog uses, so
 * streaks/heatmap/weekly stats pick it up with no separate wiring.
 */
export function FocusTimer({ userId, onLogged }: FocusTimerProps) {
  const { data: active, mutate } = useActiveFocusSession(userId);
  const [mode, setMode] = useState<FocusSessionMode>("pomodoro");
  const [activity, setActivity] = useState<StudySessionActivity>("learn");
  // Re-render tick — the actual elapsed time is computed from
  // started_at/last_resumed_at below, this state only exists to force a
  // re-render every second while running; its value itself is never read.
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active?.status === "running") {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [active?.status, active?.id]);

  const liveElapsed = (() => {
    if (!active) return 0;
    if (active.status !== "running") return active.elapsed_seconds;
    const resumedAt = new Date(active.last_resumed_at).getTime();
    const sinceResume = Math.max(0, (Date.now() - resumedAt) / 1000);
    return active.elapsed_seconds + sinceResume;
  })();

  const isCountdownLike = active?.mode === "countdown" || active?.mode === "pomodoro";
  const remaining = active?.planned_seconds != null ? Math.max(0, active.planned_seconds - liveElapsed) : null;
  const displaySeconds = isCountdownLike && remaining != null ? remaining : liveElapsed;

  // Auto-completes a countdown/Pomodoro that's run out, so the person
  // doesn't have to notice and click stop themselves.
  useEffect(() => {
    if (active?.status === "running" && isCountdownLike && remaining !== null && remaining <= 0) {
      void handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, active?.status]);

  async function handleStart() {
    if (!userId) return;
    setBusy(true);
    try {
      const plannedSeconds = mode === "pomodoro" ? POMODORO_SECONDS : mode === "countdown" ? 30 * 60 : null;
      await startFocusSession(userId, { mode, plannedSeconds, activity });
      await mutate();
    } catch {
      toast.error("Couldn't start session.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePause() {
    if (!active) return;
    setBusy(true);
    try {
      await pauseFocusSession(active.id, liveElapsed);
      await mutate();
    } catch {
      toast.error("Couldn't pause.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResume() {
    if (!active) return;
    setBusy(true);
    try {
      await resumeFocusSession(active.id);
      await mutate();
    } catch {
      toast.error("Couldn't resume.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!active) return;
    setBusy(true);
    try {
      await completeFocusSession(active.id, liveElapsed);
      await mutate();
      await onLogged?.();
      const mins = Math.round(liveElapsed / 60);
      toast.success(mins > 0 ? `Logged ${mins} min` : "Session ended");
    } catch {
      toast.error("Couldn't complete session.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscard() {
    if (!active) return;
    setBusy(true);
    try {
      await discardFocusSession(active.id);
      await mutate();
    } catch {
      toast.error("Couldn't discard.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="focus">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TimerIcon className="h-4 w-4" /> Focus session
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!active ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Select value={mode} onValueChange={(v) => setMode(v as FocusSessionMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pomodoro">Pomodoro (25 min)</SelectItem>
                  <SelectItem value="countdown">Countdown (30 min)</SelectItem>
                  <SelectItem value="stopwatch">Stopwatch (open-ended)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={activity} onValueChange={(v) => setActivity(v as StudySessionActivity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FOCUS_ACTIVITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStart} disabled={busy || !userId} size="lg">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start focus session
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <Badge variant={active.status === "running" ? "success" : "warning"}>
              {active.status === "running" ? "Running" : "Paused"} · {FOCUS_ACTIVITY_LABELS[active.activity]}
            </Badge>
            <p
              className={cn(
                "text-5xl font-bold font-mono-tabular tracking-tight",
                isCountdownLike && remaining !== null && remaining < 60 && "text-warning"
              )}
            >
              {formatClock(displaySeconds)}
            </p>
            {isCountdownLike && active.planned_seconds && (
              <div className="h-1.5 w-full max-w-xs rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-standard"
                  style={{ width: `${Math.min(100, (liveElapsed / active.planned_seconds) * 100)}%` }}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              {active.status === "running" ? (
                <Button onClick={handlePause} disabled={busy} variant="secondary">
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button onClick={handleResume} disabled={busy} variant="secondary">
                  <Play className="h-4 w-4" /> Resume
                </Button>
              )}
              <Button onClick={handleComplete} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Finish &amp; log
              </Button>
              <Button onClick={handleDiscard} disabled={busy} variant="ghost" size="sm">
                <Square className="h-3.5 w-3.5" /> Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
