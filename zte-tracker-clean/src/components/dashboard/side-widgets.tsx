"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CalendarDays, Bell, Trophy, Quote, Clock3, ListTodo, Percent, Video } from "lucide-react";
import { useDailyPlan } from "@/lib/hooks/use-daily-plan";
import { useApplicationMetrics, useInterviewRounds } from "@/lib/hooks/use-career";
import { cn, formatHours } from "@/lib/utils";
import type { DailyLog, LeaderboardEntry } from "@/types/database";
import { useNotifications, type AppNotification } from "@/lib/hooks/use-notifications";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { useTodaysSessions, useAllStudySessions } from "@/lib/hooks/use-study-sessions";
import { useUser } from "@/lib/hooks/use-user";
import Link from "next/link";

// XP is a simple, honest function of real logged hours — 1 hour = 10 XP,
// levels every 500 XP (50h). Not a new system on top of the roadmap; it's
// a motivational re-skin of completedHours, which the dashboard already
// computes. No new schema, no new table.
export function XpLevelCard({ completedHours }: { completedHours: number }) {
  const xp = Math.round(completedHours * 10);
  const xpPerLevel = 500;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const xpIntoLevel = xp % xpPerLevel;
  const pct = Math.min(100, (xpIntoLevel / xpPerLevel) * 100);

  return (
    <Card>
      <CardContent noHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-reward/15 text-reward">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-muted">Level {level}</p>
          </div>
          <span className="text-xs text-muted font-mono-tabular">{xpIntoLevel}/{xpPerLevel} XP</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-standard"
            style={{ width: `${pct}%`, background: "var(--gradient-reward)" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Mini 7-day grid — a smaller companion to the full 12-month heatmap,
// showing just "did I study each of the last 7 days" at a glance. Reuses
// the same DailyLog data the heatmap already fetches; no new query.
export function WeekGridCard({ logs }: { logs: DailyLog[] }) {
  const days = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, Number(l.hours)]));
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "narrow" }),
        hours: byDate.get(iso) ?? 0,
      };
    });
  }, [logs]);

  return (
    <Card>
      <CardContent noHeader className="flex flex-col gap-2">
        <p className="text-xs text-muted">This week</p>
        <div className="flex justify-between gap-1">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={cn(
                  "h-6 w-full rounded-md transition-standard",
                  d.hours > 0 ? "bg-accent" : "bg-border"
                )}
                style={d.hours > 0 ? { opacity: Math.min(1, 0.35 + d.hours / 4) } : undefined}
                title={`${formatHours(d.hours)} logged`}
              />
              <span className="text-[10px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Notifications preview — reuses the same priority-computed notification
// feed that drives the bell icon elsewhere in the app, surfacing the top 2
// here so the dashboard doesn't need a separate parallel "things to check"
// system. No new logic: useNotifications already merges revision/goal/
// skill/exit/application signals with dismissal state applied.
export function NotificationsPreviewCard() {
  const { notifications } = useNotifications();
  const top = notifications.slice(0, 2);
  if (top.length === 0) return null;

  return (
    <Card>
      <CardContent noHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/15 text-info">
              <Bell className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-muted">Notifications</p>
          </div>
          {notifications.length > 2 && (
            <span className="text-xs text-muted font-mono-tabular">+{notifications.length - 2} more</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {top.map((n: AppNotification) => (
            <Link key={n.id} href={n.href} className="text-xs hover:text-accent transition-standard truncate block">
              {n.title}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Leaderboard preview — the current user's own rank + streak, pulled from
// the same public leaderboard view /leaderboard reads, scoped by that
// view's own opt-in filter. Not a new ranking system, just a glanceable
// "where do I stand" card sourced from data the app already exposes.
export function LeaderboardPreviewCard() {
  const { user } = useUser();
  const { data: entries } = useLeaderboard();

  const { rank, entry } = useMemo(() => {
    if (!entries || !user) return { rank: null, entry: null };
    const sorted = [...entries].sort((a, b) => b.phases_completed - a.phases_completed);
    const idx = sorted.findIndex((e) => e.user_id === user.id);
    return idx === -1 ? { rank: null, entry: null } : { rank: idx + 1, entry: sorted[idx] as LeaderboardEntry };
  }, [entries, user]);

  if (!rank || !entry) return null;

  return (
    <Card>
      <CardContent noHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15 text-highlight">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs text-muted">Leaderboard rank</p>
            <p className="text-sm font-semibold font-mono-tabular">#{rank}</p>
          </div>
        </div>
        <Link href="/leaderboard" className="text-xs text-accent hover:underline">
          View →
        </Link>
      </CardContent>
    </Card>
  );
}

// Session count today — a live tally of Focus Timer / logged sessions,
// separate from Daily Mission's own today's-sessions list (which shows
// activity + notes detail). This is the "did I show up today" glance,
// reusing the same useTodaysSessions hook so the two never disagree.
export function SessionCountCard({ userId }: { userId: string | undefined }) {
  const { data: sessions } = useTodaysSessions(userId);
  const count = sessions?.length ?? 0;
  const totalHours = (sessions ?? []).reduce((s, sess) => s + Number(sess.hours), 0);

  return (
    <Card>
      <CardContent noHeader className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted mb-1">Sessions today</p>
          <p className="text-xl font-bold font-mono-tabular leading-none">{count}</p>
        </div>
        <span className="text-xs text-muted font-mono-tabular">{formatHours(totalHours)} logged</span>
      </CardContent>
    </Card>
  );
}

// Next-3 checklist — a read-only peek at what's coming right after the
// current topic, reusing orderedIncompleteTopics (already computed for
// Daily Mission/applyHoursToNextTopic) instead of a new fetch. Skips the
// current topic itself (already the whole point of Daily Mission) and
// shows the 3 after it, so this is purely "what's next after next."
export function NextThreeCard({
  orderedIncompleteTopics,
}: {
  orderedIncompleteTopics: { id: string; title: string; estimated_hours: number | null }[];
}) {
  const next = orderedIncompleteTopics.slice(1, 4);
  if (next.length === 0) return null;

  return (
    <Card>
      <CardContent noHeader className="flex flex-col gap-2">
        <p className="text-xs text-muted">Coming up</p>
        <ul className="flex flex-col gap-1.5">
          {next.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-xs">
              <span className="truncate">{t.title}</span>
              {t.estimated_hours && (
                <span className="text-muted font-mono-tabular shrink-0 ml-2">{formatHours(t.estimated_hours)}</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// Quick scratchpad — a lightweight, always-available note field for
// mid-study thoughts that don't belong in a topic/project/journal entry
// yet. Deliberately local-only (localStorage, debounced save): this is
// scratch space, not a new content system with its own table, sync, or
// history. Clears explicitly via the Clear button, not on a timer, so a
// half-written thought never disappears on its own.
export function ScratchpadCard() {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("zte-dashboard-scratchpad") ?? "";
  });

  useEffect(() => {
    const id = setTimeout(() => {
      window.localStorage.setItem("zte-dashboard-scratchpad", value);
    }, 400);
    return () => clearTimeout(id);
  }, [value]);

  return (
    <Card>
      <CardContent noHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">Scratchpad</p>
          {value.length > 0 && (
            <button
              onClick={() => setValue("")}
              className="text-xs text-muted hover:text-accent transition-standard"
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Jot something down..."
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </CardContent>
    </Card>
  );
}

// Application response rate — reuses application_metrics, the same
// aggregate the career tracker page reads, so this number always agrees
// with what /career shows. Renders null until there's at least one
// application, since a 0% rate on zero applications is misleading noise.
export function ApplicationRateCard({ userId }: { userId: string | undefined }) {
  const { data: metrics } = useApplicationMetrics(userId);
  if (!metrics || metrics.total_applications === 0) return null;

  return (
    <Card>
      <CardContent noHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success">
            <Percent className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs text-muted">Response rate</p>
            <p className="text-sm font-semibold font-mono-tabular">{metrics.response_rate_pct}%</p>
          </div>
        </div>
        <Link href="/career" className="text-xs text-accent hover:underline">
          View →
        </Link>
      </CardContent>
    </Card>
  );
}

// Next interview — the soonest upcoming interview_round with a scheduled
// time, so a scheduled interview is visible on the dashboard itself
// instead of requiring a trip to /interviews to notice it's coming up.
// Isolates the one impure call (Date.now()) behind a plain function,
// matching the same pattern already used in page.tsx and use-daily-plan.ts
// for the same reason — the react-compiler purity lint flags Date.now()
// called directly inside a useMemo body.
function now(): number {
  return Date.now();
}

export function NextInterviewCard({ userId }: { userId: string | undefined }) {
  const { data: rounds } = useInterviewRounds(userId);

  const next = useMemo(() => {
    if (!rounds) return null;
    const nowMs = now();
    return (
      rounds
        .filter((r) => r.scheduled_at && new Date(r.scheduled_at).getTime() >= nowMs)
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0] ?? null
    );
  }, [rounds]);

  if (!next) return null;

  return (
    <Card>
      <CardContent noHeader className="flex items-start gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/15 text-warning shrink-0">
          <Video className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted">Next interview</p>
          <p className="text-sm font-semibold truncate">{next.round_type}</p>
          <p className="text-xs text-muted font-mono-tabular">
            {new Date(next.scheduled_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Today's plan — a compact preview of the adaptive daily planner
// (generateDailyPlan), which already factors in overdue revisions, goal
// deadlines, weak skills, and interview prep into a prioritized task list
// with time estimates. Surfacing the top 3 here means the dashboard
// benefits from that existing planning logic instead of re-deriving a
// simpler version of it. availableMinutes defaults to 120 (a reasonable
// daily study block) since the dashboard doesn't ask the person to input
// their available time the way /daily-plan does.
export function TodaysPlanCard() {
  const { plan, isLoading } = useDailyPlan(120);
  if (isLoading || !plan || plan.tasks.length === 0) return null;

  return (
    <Card>
      <CardContent noHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <ListTodo className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs text-muted">Today&apos;s plan</p>
          </div>
          <Link href="/daily-plan" className="text-xs text-accent hover:underline">
            Full plan →
          </Link>
        </div>
        <ul className="flex flex-col gap-1.5">
          {plan.tasks.slice(0, 3).map((t, i) => (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="truncate">{t.title}</span>
              <span className="text-muted font-mono-tabular shrink-0 ml-2">{t.estimatedMinutes}m</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// Daily quote — deterministic by date (same quote all day, changes at
// midnight, same for every user), not random-on-every-render. No table:
// a fixed local list is enough for a rotating tip, and avoids a network
// call for something this low-stakes.
const DAILY_TIPS = [
  "Consistency beats intensity. Show up for 30 minutes today.",
  "Done is better than perfect. Ship the topic, refine later.",
  "Re-reading isn't studying. Close the tab and recall it instead.",
  "Struggling with a concept for 10 minutes before looking it up builds retention.",
  "Small daily progress compounds faster than occasional big pushes.",
  "Write the code before you read the solution.",
  "Explain it out loud — if you can't teach it, you don't know it yet.",
  "Ship something small today. Momentum matters more than scope.",
];

export function DailyTipCard() {
  const [tip] = useState(() => {
    const dayIndex = Math.floor(Date.now() / 86400000);
    return DAILY_TIPS[dayIndex % DAILY_TIPS.length];
  });

  return (
    <Card>
      <CardContent noHeader className="flex items-start gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-accent/15 text-secondary-accent shrink-0">
          <Quote className="h-3.5 w-3.5" />
        </span>
        <p className="text-xs text-muted">{tip}</p>
      </CardContent>
    </Card>
  );
}

// Time-of-day insight — bucket every logged session by hour into
// morning/afternoon/evening/night and surface whichever bucket has the
// most logged hours, so this is a real pattern from study_sessions.
// logged_at, not a static message. Needs a small sample before it says
// anything, so it renders null until there's enough history to mean
// something.
export function TimeOfDayInsightCard({ userId }: { userId: string | undefined }) {
  const { data: sessions } = useAllStudySessions(userId);

  const insight = useMemo(() => {
    if (!sessions || sessions.length < 5) return null;
    const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const s of sessions) {
      const hour = new Date(s.logged_at).getHours();
      const bucketHours = Number(s.hours);
      if (hour >= 5 && hour < 12) buckets.morning += bucketHours;
      else if (hour >= 12 && hour < 17) buckets.afternoon += bucketHours;
      else if (hour >= 17 && hour < 21) buckets.evening += bucketHours;
      else buckets.night += bucketHours;
    }
    const best = (Object.entries(buckets) as [keyof typeof buckets, number][]).sort((a, b) => b[1] - a[1])[0];
    if (best[1] === 0) return null;
    return best[0];
  }, [sessions]);

  if (!insight) return null;

  return (
    <Card>
      <CardContent noHeader className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/15 text-info shrink-0">
          <Clock3 className="h-3.5 w-3.5" />
        </span>
        <p className="text-xs text-muted">
          You log the most hours in the <span className="text-foreground/90">{insight}</span>.
        </p>
      </CardContent>
    </Card>
  );
}

// "This month" — topics completed in the current calendar month vs the
// previous one, so there's a short-horizon trend signal alongside the
// long-horizon heatmap. Derived from the same completedTopics list the
// dashboard already has; no new fetch.
export function MonthTrendCard({
  completedTopics,
}: {
  completedTopics: { progress?: { completed_at?: string | null } | null }[];
}) {
  const { thisMonth, lastMonth } = useMemo(() => {
    const now = new Date();
    const thisM = now.getMonth();
    const thisY = now.getFullYear();
    const lastM = thisM === 0 ? 11 : thisM - 1;
    const lastY = thisM === 0 ? thisY - 1 : thisY;
    let thisMonth = 0;
    let lastMonth = 0;
    for (const t of completedTopics) {
      const raw = t.progress?.completed_at;
      if (!raw) continue;
      const d = new Date(raw);
      if (d.getFullYear() === thisY && d.getMonth() === thisM) thisMonth++;
      else if (d.getFullYear() === lastY && d.getMonth() === lastM) lastMonth++;
    }
    return { thisMonth, lastMonth };
  }, [completedTopics]);

  const delta = thisMonth - lastMonth;

  return (
    <Card>
      <CardContent noHeader className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted mb-1">Topics this month</p>
          <p className="text-xl font-bold font-mono-tabular leading-none">{thisMonth}</p>
        </div>
        <span
          className={cn(
            "text-xs font-mono-tabular",
            delta > 0 ? "text-success" : delta < 0 ? "text-warning" : "text-muted"
          )}
        >
          {delta > 0 ? "+" : ""}
          {delta} vs last month
        </span>
      </CardContent>
    </Card>
  );
}

// "On this day" — surfaces a topic completed roughly a week/month/year ago
// as a small nudge. Purely derived from completedTopics already fetched by
// the dashboard; picks the most recent completion that falls on-or-before
// each anchor, so it always has something to show once there's history.
export function OnThisDayCard({
  completedTopics,
}: {
  completedTopics: { title: string; progress?: { completed_at?: string | null } | null }[];
}) {
  const memory = useMemo(() => {
    const withDates = completedTopics
      .filter((t) => t.progress?.completed_at)
      .map((t) => ({ title: t.title, date: new Date(t.progress!.completed_at!) }));
    if (withDates.length === 0) return null;

    const now = new Date();
    const anchors = [
      { label: "a week ago", days: 7 },
      { label: "a month ago", days: 30 },
    ];
    // Written as .find over a mapped array rather than a for-loop with an
    // early return — raw loop bodies inside useMemo cause the React
    // Compiler to skip memoization for the whole component (same fix
    // already applied to nextTopic/currentProject in page.tsx).
    const found = anchors
      .map((anchor) => {
        const target = new Date(now);
        target.setDate(now.getDate() - anchor.days);
        const match = withDates
          .filter((t) => t.date <= target)
          .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
        return match ? { label: anchor.label, title: match.title } : null;
      })
      .find((result) => result !== null);
    return found ?? null;
  }, [completedTopics]);

  if (!memory) return null;

  return (
    <Card>
      <CardContent noHeader className="flex items-start gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15 text-highlight shrink-0">
          <CalendarDays className="h-3.5 w-3.5" />
        </span>
        <p className="text-xs text-muted">
          {memory.label}, you finished <span className="text-foreground/90">{memory.title}</span>.
        </p>
      </CardContent>
    </Card>
  );
}