"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

// Uses the browser's native print dialog (which offers "Save as PDF" on
// every major browser/OS) rather than server-side PDF rendering — a
// Vercel serverless function is a poor fit for headless-browser-style PDF
// generation (cold starts, memory limits, extra dependency), and the
// print stylesheet in globals.css already gives a clean one-page result
// without needing a separate rendering pipeline to maintain.
export function DownloadProfilePdfButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden gap-1.5">
      <FileDown className="h-3.5 w-3.5" />
      Download as PDF
    </Button>
  );
}
