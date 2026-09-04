import { jsPDF } from "jspdf";

export interface CertificateInput {
  /** Person's name, from user_settings.display_name. Falls back to a neutral label if empty. */
  displayName: string | null;
  /** The milestone title — e.g. a phase title, or an exit point label. */
  milestoneTitle: string;
  /** Small line under the milestone title — e.g. "Phase 04" or "Exit Point B". */
  milestoneSubtitle?: string;
  /** Completion date. Defaults to now. */
  completionDate?: Date;
}

/**
 * Generates a simple, single-page landscape completion certificate as a PDF
 * and triggers a browser download. Client-side only — no server round trip,
 * no new schema, no new route.
 */
export function downloadCertificate({
  displayName,
  milestoneTitle,
  milestoneSubtitle,
  completionDate = new Date(),
}: CertificateInput) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const accent = "#6366f1";
  const ink = "#18181b";
  const muted = "#71717a";

  // Border
  doc.setDrawColor(accent);
  doc.setLineWidth(2);
  doc.rect(24, 24, pageWidth - 48, pageHeight - 48);
  doc.setLineWidth(0.75);
  doc.rect(34, 34, pageWidth - 68, pageHeight - 68);

  // Eyebrow
  doc.setTextColor(accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CERTIFICATE OF COMPLETION", pageWidth / 2, 100, { align: "center" });

  // Recipient
  doc.setTextColor(muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("This certifies that", pageWidth / 2, 150, { align: "center" });

  doc.setTextColor(ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(displayName?.trim() || "ZTE Tracker Learner", pageWidth / 2, 188, { align: "center" });

  // Milestone
  doc.setTextColor(muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("has successfully completed", pageWidth / 2, 226, { align: "center" });

  doc.setTextColor(ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(milestoneTitle, pageWidth / 2, 258, { align: "center", maxWidth: pageWidth - 160 });

  if (milestoneSubtitle) {
    doc.setTextColor(muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(milestoneSubtitle, pageWidth / 2, 280, { align: "center" });
  }

  // Date + footer
  const dateStr = completionDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setTextColor(muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(dateStr, pageWidth / 2, pageHeight - 70, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(accent);
  doc.text("ZTE Tracker", pageWidth / 2, pageHeight - 52, { align: "center" });

  const safeName = (displayName?.trim() || "learner").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const safeMilestone = milestoneTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`certificate-${safeMilestone}-${safeName}.pdf`);
}
