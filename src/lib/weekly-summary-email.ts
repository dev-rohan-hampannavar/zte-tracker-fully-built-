interface WeeklySummaryData {
  recipientName: string | null;
  studentName: string | null;
  weekStart: string; // YYYY-MM-DD, Monday
  weekEnd: string; // YYYY-MM-DD, Sunday
  hoursThisWeek: number;
  daysLoggedThisWeek: number;
  topicsCompletedThisWeek: { title: string }[];
  currentStreak: number;
  overallPercent: number;
  totalDone: number;
  totalTopics: number;
  profileUrl: string | null;
}

function formatDateRange(startISO: string, endISO: string): string {
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Plain hand-written HTML rather than @react-email/components — this is a
 * single template with no reuse case yet, and email HTML needs table-based
 * layout / inline styles regardless of what generates it, so a component
 * library earns its keep only once there's a second or third template.
 * Kept intentionally simple: no external images, no webfonts (most email
 * clients strip both or render inconsistently), just inline-styled HTML
 * that degrades gracefully everywhere.
 */
export function renderWeeklySummaryEmail(data: WeeklySummaryData): { subject: string; html: string } {
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : "Hi,";
  const who = data.studentName ?? "They";
  const dateRange = formatDateRange(data.weekStart, data.weekEnd);

  const topicsList =
    data.topicsCompletedThisWeek.length > 0
      ? data.topicsCompletedThisWeek
          .slice(0, 10)
          .map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t.title)}</li>`)
          .join("")
      : `<li style="color:#8a8578;">No topics finished this week — hours were still logged toward the current one.</li>`;

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f7f1e8;font-family:Georgia,'Times New Roman',serif;color:#2b2016;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f1e8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4dbc9;">
          <tr>
            <td style="background-color:#5c4a38;padding:28px 32px;">
              <p style="margin:0;color:#c9a876;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Weekly Progress Summary</p>
              <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:bold;">${dateRange}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                Here's ${who === "They" ? "their" : `${escapeHtml(who)}'s`} progress this week on the engineering roadmap.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="33%" style="background-color:#f7f1e8;border-radius:8px;padding:16px 8px;text-align:center;">
                    <p style="margin:0;font-size:24px;font-weight:bold;color:#5c4a38;">${data.hoursThisWeek.toFixed(1)}h</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#6b5f52;text-transform:uppercase;letter-spacing:0.5px;">Hours logged</p>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="background-color:#f7f1e8;border-radius:8px;padding:16px 8px;text-align:center;">
                    <p style="margin:0;font-size:24px;font-weight:bold;color:#5c4a38;">${data.daysLoggedThisWeek}/7</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#6b5f52;text-transform:uppercase;letter-spacing:0.5px;">Days studied</p>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="background-color:#f7f1e8;border-radius:8px;padding:16px 8px;text-align:center;">
                    <p style="margin:0;font-size:24px;font-weight:bold;color:#5c4a38;">${data.currentStreak}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#6b5f52;text-transform:uppercase;letter-spacing:0.5px;">Day streak</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#5c4a38;">Topics finished this week</p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.6;">
                ${topicsList}
              </ul>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#e4edf0;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:14px;">
                      Overall roadmap progress: <strong>${data.overallPercent}%</strong>
                      (${data.totalDone}/${data.totalTopics} topics)
                    </p>
                  </td>
                </tr>
              </table>

              ${
                data.profileUrl
                  ? `<p style="margin:0;font-size:13px;color:#6b5f52;">Full progress page: <a href="${data.profileUrl}" style="color:#8b6f52;">${data.profileUrl}</a></p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f7f1e8;text-align:center;">
              <p style="margin:0;font-size:11px;color:#8a8578;">Sent automatically every week from ZTE Tracker.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return {
    subject: `${who === "They" ? "Weekly" : `${who}'s weekly`} progress: ${data.hoursThisWeek.toFixed(1)}h logged, ${data.topicsCompletedThisWeek.length} topics done`,
    html,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
