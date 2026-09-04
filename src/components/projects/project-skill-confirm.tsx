"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { addProjectSkill, removeProjectSkill } from "@/lib/hooks/use-project-skills";
import type { ProjectSkill, Technology } from "@/types/database";
import { cn } from "@/lib/utils";

interface ProjectSkillConfirmProps {
  userId: string | undefined;
  phaseId?: string;
  advancedProjectId?: string;
  /** Technologies detected in the project's description text — suggestions
   * only, not yet evidence, until confirmed here. */
  suggested: Technology[];
  /** Already-confirmed project_skills rows for this specific project. */
  confirmed: ProjectSkill[];
  onChanged: () => Promise<unknown> | void;
}

/**
 * Turns matchTechnologiesInText()'s text-derived suggestions into
 * persisted project_skills rows once the user confirms them — this is
 * the boundary between "the curriculum description mentions React" and
 * "I actually used React here," which is what skill_evidence.project_count
 * should be built on (see 0033's rationale comment).
 */
export function ProjectSkillConfirm({
  userId,
  phaseId,
  advancedProjectId,
  suggested,
  confirmed,
  onChanged,
}: ProjectSkillConfirmProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const confirmedTechIds = new Set(confirmed.map((c) => c.technology_id));
  const unconfirmedSuggestions = suggested.filter((t) => !confirmedTechIds.has(t.id));

  async function handleConfirm(techId: string) {
    if (!userId) return;
    setBusyId(techId);
    try {
      await addProjectSkill(userId, { phaseId, advancedProjectId, technologyId: techId });
      await onChanged();
    } catch {
      toast.error("Couldn't confirm skill.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(row: ProjectSkill) {
    setBusyId(row.technology_id);
    try {
      await removeProjectSkill(row.id);
      await onChanged();
    } catch {
      toast.error("Couldn't remove skill.");
    } finally {
      setBusyId(null);
    }
  }

  if (suggested.length === 0 && confirmed.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <span className="text-[10px] text-muted mr-0.5 flex items-center gap-0.5">
        <Sparkles className="h-2.5 w-2.5" /> Skill evidence:
      </span>
      {confirmed.map((row) => {
        const tech = suggested.find((t) => t.id === row.technology_id);
        return (
          <button
            key={row.id}
            onClick={() => handleRemove(row)}
            disabled={busyId === row.technology_id}
            title="Confirmed — counts toward skill evidence. Click to remove."
            aria-label={`Remove confirmed skill: ${tech?.name ?? row.technology_id}`}
          >
            <Badge variant="success" className="text-[10px] font-normal cursor-pointer">
              {busyId === row.technology_id ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <Check className="h-2.5 w-2.5" />
              )}
              {tech?.name ?? row.technology_id}
            </Badge>
          </button>
        );
      })}
      {unconfirmedSuggestions.map((tech) => (
        <button
          key={tech.id}
          onClick={() => handleConfirm(tech.id)}
          disabled={busyId === tech.id}
          className={cn(
            "text-[10px] font-normal rounded-full border border-dashed border-muted-2/50 px-2 py-0.5 text-muted",
            "hover:border-accent hover:text-accent transition-standard flex items-center gap-1"
          )}
          title="Detected from the project description — click to confirm as real skill evidence"
        >
          {busyId === tech.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
          {tech.name}?
        </button>
      ))}
    </div>
  );
}
