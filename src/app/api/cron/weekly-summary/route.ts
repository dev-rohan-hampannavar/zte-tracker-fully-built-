import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderWeeklySummaryEmail } from "@/lib/weekly-summary-email";

// Not Vercel Cron — see the reasoning documented in
// supabase/migrations/0025_weekly_summary_email.sql's comment and the
// README section on this feature. This route is instead triggered by an
// external pinger (e.g. cron-job.org) hitting it once a week with the
// secret below, decoupling "did the email send" from "is Vercel Cron
// working today" — an external service has its own dashboard, retry
// policy, and failure alerting independent of this app's own hosting.
export const dynamic = "force-dynamic";

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Monday..Sunday of the week that just ended — this route is meant to run
// on Sundays, so "this week" at trigger time already includes today.
function currentWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { weekStart: localDateISO(monday), weekEnd: localDateISO(sunday) };
}

function computeStreak(dates: Set<string>): number {
  let current = 0;
  const cursor = new Date();
  // If today isn't logged yet, the streak is still whatever it was through
  // yesterday — same "don't zero out a streak just because today hasn't
  // happened yet" logic the in-app computeStreak (use-daily-logs.ts) uses.
  if (!dates.has(localDateISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(localDateISO(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return current;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.CRON_SECRET) {
    // Fails closed: an unset secret should never accidentally mean "anyone
    // can trigger this," so an empty/undefined secret is treated the same
    // as a mismatched one above already would be — this check exists so a
    // misconfigured deploy is loud (500, visible in the pinger's own
    // failure log) rather than silently sending to nobody or, worse, to
    // everyone on every request.
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { weekStart, weekEnd } = currentWeekRange();

  const { data: optedIn, error: settingsError } = (await supabase
    .from("user_settings")
    .select("user_id, display_name, weekly_summary_recipient_email, weekly_summary_recipient_name, weekly_summary_last_sent_at, public_profile_enabled, public_profile_slug")
    .eq("weekly_summary_enabled", true)
    .not("weekly_summary_recipient_email", "is", null)) as {
    data:
      | {
          user_id: string;
          display_name: string | null;
          weekly_summary_recipient_email: string | null;
          weekly_summary_recipient_name: string | null;
          weekly_summary_last_sent_at: string | null;
          public_profile_enabled: boolean;
          public_profile_slug: string | null;
        }[]
      | null;
    error: { message: string } | null;
  };

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const results: { userId: string; status: "sent" | "skipped" | "failed"; reason?: string }[] = [];

  for (const row of optedIn ?? []) {
    // Idempotency: if this week's send already happened (checked by
    // comparing weekStart against the stored last-sent timestamp's own
    // week), skip it — protects against the external pinger firing twice
    // for the same week (a retry after a slow response, a manual re-run,
    // etc.) resulting in a duplicate email.
    if (row.weekly_summary_last_sent_at) {
      const lastSentWeek = (() => {
        const d = new Date(row.weekly_summary_last_sent_at);
        const day = d.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        const monday = new Date(d);
        monday.setDate(d.getDate() - diffToMonday);
        return localDateISO(monday);
      })();
      if (lastSentWeek === weekStart) {
        results.push({ userId: row.user_id, status: "skipped", reason: "already sent this week" });
        continue;
      }
    }

    try {
      const [{ data: logs }, { data: progress }, { data: topics }] = (await Promise.all([
        supabase.from("daily_logs").select("date, hours").eq("user_id", row.user_id).gte("date", weekStart).lte("date", weekEnd),
        supabase.from("topic_progress").select("topic_id, completed, completed_at").eq("user_id", row.user_id),
        supabase.from("topics").select("id, title"),
      ])) as [
        { data: { date: string; hours: number }[] | null },
        { data: { topic_id: string; completed: boolean; completed_at: string | null }[] | null },
        { data: { id: string; title: string }[] | null },
      ];

      const { data: allLogs } = (await supabase.from("daily_logs").select("date").eq("user_id", row.user_id)) as {
        data: { date: string }[] | null;
      };
      const loggedDates = new Set((allLogs ?? []).map((l) => l.date));

      const weekLogs = logs ?? [];
      const hoursThisWeek = weekLogs.reduce((sum, l) => sum + Number(l.hours), 0);
      const daysLoggedThisWeek = weekLogs.filter((l) => Number(l.hours) > 0).length;

      const topicById = new Map((topics ?? []).map((t) => [t.id, t.title]));
      const completedThisWeek = (progress ?? []).filter(
        (p) => p.completed && p.completed_at && p.completed_at.slice(0, 10) >= weekStart && p.completed_at.slice(0, 10) <= weekEnd
      );
      const totalDone = (progress ?? []).filter((p) => p.completed).length;
      const totalTopics = (topics ?? []).length;

      const { subject, html } = renderWeeklySummaryEmail({
        recipientName: row.weekly_summary_recipient_name,
        studentName: row.display_name,
        weekStart,
        weekEnd,
        hoursThisWeek,
        daysLoggedThisWeek,
        topicsCompletedThisWeek: completedThisWeek.map((p) => ({ title: topicById.get(p.topic_id) ?? "Untitled topic" })),
        currentStreak: computeStreak(loggedDates),
        overallPercent: totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0,
        totalDone,
        totalTopics,
        profileUrl:
          row.public_profile_enabled && row.public_profile_slug
            ? `https://${request.headers.get("host") ?? ""}/u/${row.public_profile_slug}`
            : null,
      });

      const sendResult = await resend.emails.send({
        from: process.env.WEEKLY_SUMMARY_FROM_EMAIL || "ZTE Tracker <onboarding@resend.dev>",
        to: row.weekly_summary_recipient_email!,
        subject,
        html,
      });

      if (sendResult.error) {
        results.push({ userId: row.user_id, status: "failed", reason: sendResult.error.message });
        continue;
      }

      await supabase
        .from("user_settings")
        .update({ weekly_summary_last_sent_at: new Date().toISOString() } as never)
        .eq("user_id", row.user_id);

      results.push({ userId: row.user_id, status: "sent" });
    } catch (err) {
      results.push({ userId: row.user_id, status: "failed", reason: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return NextResponse.json({ weekStart, weekEnd, results });
}
