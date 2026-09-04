"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectProgress } from "@/types/database";

/**
 * Spec section 31: a project should carry Problem / Architecture /
 * Contribution / Challenges / Trade-offs / Metrics / Tests /
 * Documentation as distinct fields a recruiter could actually scan,
 * rather than one undifferentiated notes paragraph. Collapsed by default
 * — most projects won't have this filled in yet, and showing 7 empty
 * textareas on every project card by default would be exactly the
 * "giant information-dense card" the master spec's UX rules (section 38)
 * warn against.
 */

const FIELDS: { key: keyof ProjectProgress; label: string; placeholder: string }[] = [
  { key: "problem_statement", label: "Problem", placeholder: "What problem does this solve, and for whom?" },
  { key: "architecture_notes", label: "Architecture", placeholder: "High-level design — services, data flow, key decisions" },
  { key: "contribution_notes", label: "Your contribution", placeholder: "What specifically did you build vs. use off the shelf?" },
  { key: "challenges_notes", label: "Challenges", placeholder: "What was genuinely hard, and how did you solve it?" },
  { key: "tradeoffs_notes", label: "Trade-offs", placeholder: "What did you choose not to do, and why?" },
  { key: "metrics_notes", label: "Metrics", placeholder: "Real numbers if you have them — latency, test coverage, users" },
  { key: "testing_notes", label: "Tests", placeholder: "What's actually tested, and how" },
];

export function RecruiterEvidenceEditor({
  project,
  onSave,
}: {
  project: ProjectProgress | undefined;
  onSave: (patch: Partial<ProjectProgress>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filledCount = FIELDS.filter((f) => project?.[f.key]).length + (project?.documentation_url ? 1 : 0);

  return (
    <div className="border-t border-border/60 pt-2 mt-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors w-full"
      >
        <FileText className="h-3 w-3" />
        Recruiter evidence
        {filledCount > 0 && <span className="text-[10px]">({filledCount}/8 filled)</span>}
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 mt-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <Label className="text-xs text-muted">{f.label}</Label>
              <Textarea
                placeholder={f.placeholder}
                defaultValue={(project?.[f.key] as string | null) ?? ""}
                rows={2}
                className="text-sm"
                onBlur={(e) => onSave({ [f.key]: e.target.value || null })}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted">Documentation URL</Label>
            <Input
              placeholder="README, wiki, or design doc link"
              defaultValue={project?.documentation_url ?? ""}
              onBlur={(e) => onSave({ documentation_url: e.target.value || null })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
