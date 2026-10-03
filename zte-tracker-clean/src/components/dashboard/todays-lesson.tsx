"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen } from "lucide-react";
import type { ManualDay } from "@/lib/hooks/use-manual-day";
import { useManualItemChecks, setManualItemChecked } from "@/lib/hooks/use-manual-item-checks";
import type { DailyLog } from "@/types/database";
import { cn, formatHours } from "@/lib/utils";

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

// Sections where each bullet is a discrete task worth checking off, rather
// than reference material to just read. Matched by prefix since some
// titles vary slightly (e.g. "PROJECT WORK — CLIENTSYNC / DEVSCRIBE").
const CHECKABLE_SECTION_PREFIXES = ["PRACTICE PROBLEMS", "HANDS-ON CODING", "GIT TASKS"];
function isCheckableSection(title: string): boolean {
  const t = title.toUpperCase();
  return CHECKABLE_SECTION_PREFIXES.some((p) => t.startsWith(p));
}

// Renders one section's raw text content: "* " prefixed lines become bullet
// points (or checkboxes, for checkable sections), blank lines become
// spacing, everything else is a plain line. The manual's content is plain
// text (no markdown/HTML), so this is a small line-based renderer rather
// than pulling in a markdown parser.
function SectionContent({
  content,
  checkable,
  checkedItems,
  onToggle,
}: {
  content: string;
  checkable: boolean;
  checkedItems: Set<string> | undefined;
  onToggle: (itemIndex: number, checked: boolean) => void;
}) {
  const lines = content.split("\n").filter((l, i, arr) => l.trim() !== "" || (arr[i - 1] ?? "").trim() !== "");
  let bulletIndex = 0;
  return (
    <div className="flex flex-col gap-1.5 text-sm text-foreground/90">
      {lines.map((line, i) => {
        const bullet = line.match(/^\s*\*\s+(.*)/);
        if (bullet) {
          const idx = bulletIndex++;
          if (checkable) {
            const checked = checkedItems?.has(String(idx)) ?? false;
            return (
              <label key={i} className="flex gap-2 pl-1 items-start cursor-pointer group">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => onToggle(idx, v === true)}
                  className="mt-0.5"
                />
                <span className={cn("group-hover:text-foreground", checked && "line-through text-muted")}>
                  {bullet[1]}
                </span>
              </label>
            );
          }
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

export function TodaysLesson({
  day,
  userId,
  yesterdaysLog,
}: {
  day: ManualDay;
  userId: string | undefined;
  yesterdaysLog?: DailyLog | null;
}) {
  const { data: checkedItems, mutate: mutateChecks } = useManualItemChecks(userId, day.day);

  async function handleToggle(sectionTitle: string, itemIndex: number, checked: boolean) {
    if (!userId) return;
    // Optimistic update so the checkbox responds instantly, not after the
    // round trip — matches the feel of the rest of the app's toggles
    // (topic complete, DSA problems, etc.).
    const key = `${sectionTitle}::${itemIndex}`;
    await mutateChecks(
      (prev) => {
        const next = new Set(prev ?? []);
        if (checked) next.add(key);
        else next.delete(key);
        return next;
      },
      { revalidate: false }
    );
    try {
      await setManualItemChecked(userId, day.day, sectionTitle, itemIndex, checked);
    } catch {
      await mutateChecks(); // revert to server truth on failure
    }
  }

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
          const checkable = isCheckableSection(section.title);
          // checkedItems is keyed "sectionTitle::itemIndex" globally for the
          // day, but SectionContent only needs this section's item indices —
          // build a small per-section lookup keyed by index alone.
          const sectionChecks = checkable
            ? new Set(
                [...(checkedItems ?? [])]
                  .filter((k) => k.startsWith(`${section.title}::`))
                  .map((k) => k.split("::")[1])
              )
            : undefined;
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
                <SectionContent
                  content={section.content}
                  checkable={checkable}
                  checkedItems={sectionChecks}
                  onToggle={(itemIndex, checked) => handleToggle(section.title, itemIndex, checked)}
                />
                {section.title.toUpperCase().startsWith("YESTERDAY REVIEW") && yesterdaysLog && (
                  <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-2 text-sm">
                    <p className="text-xs font-medium text-muted uppercase tracking-wide">
                      What you actually logged yesterday
                    </p>
                    {yesterdaysLog.wins && (
                      <p>
                        <span className="font-medium text-foreground">Wins: </span>
                        <span className="text-foreground/90">{yesterdaysLog.wins}</span>
                      </p>
                    )}
                    {yesterdaysLog.learned && (
                      <p>
                        <span className="font-medium text-foreground">Learned: </span>
                        <span className="text-foreground/90">{yesterdaysLog.learned}</span>
                      </p>
                    )}
                    {yesterdaysLog.mistakes && (
                      <p>
                        <span className="font-medium text-foreground">Mistakes: </span>
                        <span className="text-foreground/90">{yesterdaysLog.mistakes}</span>
                      </p>
                    )}
                    {!yesterdaysLog.wins && !yesterdaysLog.learned && !yesterdaysLog.mistakes && (
                      <p className="text-muted">
                        {formatHours(yesterdaysLog.hours)} logged, but no journal notes were saved.
                      </p>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
