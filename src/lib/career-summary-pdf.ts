import { jsPDF } from "jspdf";

export interface CareerSummaryInput {
  displayName: string | null;
  generatedAt?: Date;
  phasesCompleted: number;
  totalPhases: number;
  topicsCompleted: number;
  totalTopics: number;
  dsaSolved: number;
  projectsShipped: number;
  applicationsSubmitted: number;
  offersReceived: number;
  // Optional so this stays usable even for a user with no role selected /
  // no readiness data yet — reported plainly as "not available" rather
  // than a fabricated number.
  readinessPct: number | null;
  readinessRoleName: string | null;
  milestonesReached: { label: string; description: string }[];
}

/**
 * A concise one-page PDF summary of real progress — spec section 26 asks
 * for JSON/CSV/PDF export; JSON (buildExportPayload) already covers every
 * table and CSV covers roadmap topics, but there was no PDF option at
 * all despite jspdf already being a dependency (certificate.ts already
 * uses it for completion certificates — this reuses that same pattern
 * and client-side-only approach, no new dependency, no server round
 * trip).
 *
 * Deliberately a summary, not a full data dump — a person wanting every
 * row already has JSON for that; a PDF's actual value here is something
 * skimmable (e.g. to attach to an application or review offline), so it
 * shows real, already-computed headline numbers rather than reproducing
 * the JSON export in a harder-to-read format.
 */
export function downloadCareerSummaryPdf(input: CareerSummaryInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 64;

  const ink = "#18181b";
  const muted = "#71717a";
  const accent = "#6366f1";

  doc.setTextColor(accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Career Summary", margin, y);
  y += 20;

  doc.setTextColor(muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const generated = input.generatedAt ?? new Date();
  doc.text(
    `${input.displayName ?? "ZTE Tracker"} — generated ${generated.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`,
    margin,
    y
  );
  y += 32;

  function statRow(label: string, value: string) {
    doc.setTextColor(muted);
    doc.setFontSize(10);
    doc.text(label, margin, y);
    doc.setTextColor(ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(value, pageWidth - margin, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 20;
  }

  doc.setTextColor(ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Progress", margin, y);
  y += 18;
  statRow("Phases complete", `${input.phasesCompleted}/${input.totalPhases}`);
  statRow("Topics complete", `${input.topicsCompleted}/${input.totalTopics}`);
  statRow("DSA problems solved", `${input.dsaSolved}`);
  statRow("Projects shipped", `${input.projectsShipped}`);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Career readiness", margin, y);
  y += 18;
  statRow(
    input.readinessRoleName ? `Readiness for ${input.readinessRoleName}` : "Readiness",
    input.readinessPct === null ? "Not available" : `${Math.round(input.readinessPct)}%`
  );
  statRow("Applications submitted", `${input.applicationsSubmitted}`);
  statRow("Offers received", `${input.offersReceived}`);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Milestones reached", margin, y);
  y += 18;
  if (input.milestonesReached.length === 0) {
    doc.setTextColor(muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("None yet.", margin, y);
    y += 16;
  } else {
    for (const m of input.milestonesReached) {
      doc.setTextColor(ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(`• ${m.label}`, margin, y);
      y += 14;
      doc.setTextColor(muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(m.description, margin + 12, y);
      y += 16;
    }
  }

  doc.save("zte-tracker-career-summary.pdf");
}
