"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  AlertCircle,
  ListChecks,
  Sparkles,
  FolderGit2,
  TrendingUp,
  Flame,
  Gauge,
  Target,
  CalendarClock,
  Clock,
  Trophy,
  X,
  CheckCheck,
} from "lucide-react";
import { useUser } from "@/lib/hooks/use-user";
import {
  useNotifications,
  dismissNotification,
  snoozeNotification,
  markAllRead,
  type AppNotification,
  type NotificationKind,
} from "@/lib/hooks/use-notifications";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const KIND_ICON: Record<NotificationKind, typeof AlertCircle> = {
  revision_overdue: AlertCircle,
  milestone_pending: ListChecks,
  ready_to_apply: Sparkles,
  project_inactive: FolderGit2,
  exit_almost_ready: TrendingUp,
  daily_log_missing: Flame,
  skill_stale: Gauge,
  goal_deadline: Target,
  interview_reminder: CalendarClock,
  follow_up_reminder: Clock,
  career_milestone: Trophy,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  revision_overdue: "text-danger",
  milestone_pending: "text-warning",
  ready_to_apply: "text-success",
  project_inactive: "text-warning",
  exit_almost_ready: "text-accent",
  daily_log_missing: "text-accent",
  skill_stale: "text-danger",
  goal_deadline: "text-warning",
  interview_reminder: "text-accent",
  follow_up_reminder: "text-warning",
  career_milestone: "text-success",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { notifications, isLoading, mutateDismissals } = useNotifications();

  async function handleMarkAllRead() {
    if (!user) return;
    try {
      await markAllRead(user.id, notifications.map((n) => n.id));
      await mutateDismissals();
    } catch {
      toast.error("Couldn't mark as read.");
    }
  }

  async function handleDismiss(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await dismissNotification(user.id, id, "deleted");
      await mutateDismissals();
    } catch {
      toast.error("Couldn't dismiss.");
    }
  }

  async function handleSnooze(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await snoozeNotification(user.id, id, 24);
      await mutateDismissals();
      toast.success("Snoozed for 24h");
    } catch {
      toast.error("Couldn't snooze.");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-standard"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger pulse-dot" />
        )}
      </button>

      <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border glass-panel shadow-xl z-50 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <p className="text-xs font-medium text-muted">
                {isLoading ? "Loading…" : `${notifications.length} thing${notifications.length === 1 ? "" : "s"} need attention`}
              </p>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-muted hover:text-foreground flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!isLoading && notifications.length === 0 && (
                <p className="px-3 py-6 text-sm text-muted text-center">You&apos;re all caught up.</p>
              )}
              {notifications.map((n: AppNotification) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-2 transition-standard border-b border-border last:border-0"
                  >
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${KIND_COLOR[n.kind]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.detail}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-standard shrink-0">
                      <button
                        onClick={(e) => handleSnooze(e, n.id)}
                        className="text-muted hover:text-foreground p-0.5"
                        aria-label="Snooze 24h"
                        title="Snooze 24h"
                      >
                        <Clock className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleDismiss(e, n.id)}
                        className="text-muted hover:text-danger p-0.5"
                        aria-label="Dismiss"
                        title="Dismiss"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  );
}
