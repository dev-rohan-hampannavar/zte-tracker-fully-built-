"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useProjectInterviewQuestions,
  useProjectInterviewAttempts,
  syncGeneratedQuestions,
  logProjectInterviewAttempt,
} from "@/lib/hooks/use-project-interview-prep";
import { generateProjectInterviewQuestions, type ProjectForPrompts } from "@/lib/project-interview-prompts";
import type { InterviewAttemptResult } from "@/types/database";

const CATEGORY_LABEL: Record<string, string> = {
  architecture: "Architecture",
  backend: "Backend",
  performance: "Performance",
  security: "Security",
  testing: "Testing",
  tradeoffs: "Trade-offs",
};

const RESULT_OPTIONS: { value: InterviewAttemptResult; label: string }[] = [
  { value: "correct", label: "Nailed it" },
  { value: "partial", label: "Partially right" },
  { value: "incorrect", label: "Missed it" },
];

export function ProjectInterviewPrep({
  userId,
  phaseId,
  project,
}: {
  userId: string | undefined;
  phaseId: string;
  project: ProjectForPrompts;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: questions, mutate: mutateQuestions } = useProjectInterviewQuestions(userId, phaseId);
  const questionIds = useMemo(() => (questions ?? []).map((q) => q.id), [questions]);
  const { data: attempts, mutate: mutateAttempts } = useProjectInterviewAttempts(userId, questionIds);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const attemptsByQuestion = useMemo(() => {
    const map = new Map<string, typeof attempts>();
    for (const a of attempts ?? []) {
      const list = map.get(a.question_id) ?? [];
      list.push(a);
      map.set(a.question_id, list);
    }
    return map;
  }, [attempts]);

  async function handleGenerate() {
    if (!userId) return;
    setGenerating(true);
    try {
      const generated = generateProjectInterviewQuestions(project);
      if (generated.length === 0) {
        toast.info("Fill in architecture, metrics, testing, or trade-offs notes to generate questions from them.");
        return;
      }
      await syncGeneratedQuestions(userId, { phaseId }, generated, questions ?? []);
      await mutateQuestions();
      toast.success("Interview questions generated from this project's evidence.");
    } catch {
      toast.error("Couldn't generate questions.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleLogAttempt(questionId: string, result: InterviewAttemptResult) {
    if (!userId) return;
    try {
      await logProjectInterviewAttempt(userId, questionId, result, answerDrafts[questionId]?.trim() || undefined);
      await mutateAttempts();
      toast.success("Practice attempt logged.");
    } catch {
      toast.error("Couldn't log attempt.");
    }
  }

  return (
    <div className="border-t border-border/60 pt-2 mt-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors w-full"
      >
        <Brain className="h-3 w-3" />
        Interview prep from this project
        {(questions?.length ?? 0) > 0 && <span className="text-[10px]">({questions!.length} questions)</span>}
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 mt-3">
          <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={generating} className="w-fit">
            <Sparkles className="h-3.5 w-3.5" /> {generating ? "Generating…" : "Generate from this project's evidence"}
          </Button>

          {(questions ?? []).length === 0 && (
            <p className="text-xs text-muted">
              No questions yet. Fill in the recruiter evidence fields above (architecture, metrics, testing,
              trade-offs), then generate — questions are only created from data this project actually has.
            </p>
          )}

          {(questions ?? []).map((q) => {
            const questionAttempts = attemptsByQuestion.get(q.id) ?? [];
            return (
              <div key={q.id} className="rounded-md border border-border/60 px-3 py-2.5 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {CATEGORY_LABEL[q.category] ?? q.category}
                  </Badge>
                  <p className="text-sm">{q.question}</p>
                </div>
                <Textarea
                  placeholder="Your answer (saved when you log an attempt)"
                  rows={2}
                  className="text-sm"
                  defaultValue={questionAttempts[0]?.notes ?? ""}
                  onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {RESULT_OPTIONS.map((r) => (
                    <Button key={r.value} size="sm" variant="outline" onClick={() => handleLogAttempt(q.id, r.value)}>
                      {r.label}
                    </Button>
                  ))}
                  {questionAttempts.length > 0 && (
                    <span className="text-[11px] text-muted ml-auto">
                      Practiced {questionAttempts.length} time{questionAttempts.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
