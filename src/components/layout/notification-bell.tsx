"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, AlertCircle, ListChecks, Sparkles, FolderGit2, TrendingUp } from "lucide-react";
import { useNotifications, type AppNotification, type NotificationKind } from "@/lib/hooks/use-notifications";

const KIND_ICON: Record<NotificationKind, typeof AlertCircle> = {
  revision_overdue: AlertCircle,
  milestone_pending: ListChecks,
  ready_to_apply: Sparkles,
  project_inactive: FolderGit2,
  exit_almost_ready: TrendingUp,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  revision_overdue: "text-danger",
  milestone_pending: "text-warning",
  ready_to_apply: "text-success",
  project_inactive: "text-warning",
  exit_almost_ready: "text-accent",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, isLoading } = useNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-surface shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-medium text-muted">
                {isLoading ? "Loading…" : `${notifications.length} thing${notifications.length === 1 ? "" : "s"} need attention`}
              </p>
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
                    className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-2 transition-colors border-b border-border last:border-0"
                  >
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${KIND_COLOR[n.kind]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.detail}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
