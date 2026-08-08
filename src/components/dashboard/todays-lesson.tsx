import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";
import type { ManualDay } from "@/lib/hooks/use-manual-day";
import { cn } from "@/lib/utils";

// Section-type -> visual grouping, mirroring the earthy accent scheme used
// in the DOCX execution manual (generate.js) so the two surfaces feel like
// the same document: warm tan/brown for objectives-type content, cool blue
// for review/reference-type content, rust for warnings.
function sectionVariant(title: string): "warm" | "cool" | "warn" {
  const t = title.toUpperCase();
  if (t.startsWith("COMMON MISTAKES") || t.startsWith("KNOWLEDGE GAPS") || t.includes("DEBUGGING CHALLENGE")) {
    return "warn";
  }
  if (
    t.startsWith("YESTERDAY REVIEW") ||
    t.startsWith("RESOURCES") ||
    t.startsWith("VIDEOS") ||
    t.startsWith("REVISION") ||
    t.startsWith("WEEKLY") ||
    t.startsWith("MONTHLY")
  ) {
    return "cool";
  }
  return "warm";
}

const variantClasses: Record<string, string> = {
  warm: "border-l-4 border-l-accent bg-accent/5",
  cool: "border-l-4 border-l-info bg-info/5",
  warn: "border-l-4 border-l-warning bg-warning/5",
};

// Renders one section's raw text content: "* " prefixed lines become bullet
// points, blank lines become spacing, everything else is a plain line.
// The manual's content is plain text (no markdown/HTML), so this is a
// small line-based renderer rather than pulling in a markdown parser.
function SectionContent({ content }: { content: string }) {
  const lines = content.split("\n").filter((l, i, arr) => l.trim() !== "" || (arr[i - 1] ?? "").trim() !== "");
  return (
    <div className="flex flex-col gap-1.5 text-sm text-foreground/90">
      {lines.map((line, i) => {
        const bullet = line.match(/^\s*\*\s+(.*)/);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-accent shrink-0">▸</span>
              <span>{bullet[1]}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return (
          <p key={i} className="leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function TodaysLesson({ day }: { day: ManualDay }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-medium text-muted">
          Day {day.day} · {day.phase.title}
        </span>
      </div>

      <Accordion type="multiple" className="flex flex-col gap-2">
        {day.sections.map((section, i) => {
          const variant = sectionVariant(section.title);
          return (
            <AccordionItem
              key={`${section.title}-${i}`}
              value={`${section.title}-${i}`}
              className={cn(variantClasses[variant])}
            >
              <AccordionTrigger className="py-2.5 px-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {section.title}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3">
                <SectionContent content={section.content} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
