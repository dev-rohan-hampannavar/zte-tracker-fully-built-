"use client";

import { useMemo, useState } from "react";
import { useUser } from "@/lib/hooks/use-user";
import {
  useInterviewQuestions,
  useInterviewWeaknesses,
  logInterviewAttempt,
  ATTEMPT_RESULT_LABELS,
} from "@/lib/hooks/use-interview-prep";
import { INTERVIEW_ROUND_TYPES } from "@/lib/hooks/use-career";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Brain, Check, CircleAlert, Loader2, Shuffle, X, Minus } from "lucide-react";
import type { InterviewAttemptResult, InterviewRoundType } from "@/types/database";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { motion, AnimatePresence } from "framer-motion";
import { TimedInterviewSimulator } from "@/components/interviews/timed-interview-simulator";

export default function InterviewPrepPage() {
  const { user } = useUser();
  const [roundType, setRoundType] = useState<InterviewRoundType>("technical");
  const { data: questions, isLoading: questionsLoading } = useInterviewQuestions(roundType);
  const { data: weaknesses, mutate: mutateWeaknesses, isLoading: weaknessesLoading } = useInterviewWeaknesses(user?.id);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [logging, setLogging] = useState<InterviewAttemptResult | null>(null);
  const [revealed, setRevealed] = useState(false);

  const current = questions?.[currentIndex % Math.max(questions.length, 1)];

  function nextQuestion() {
    setRevealed(false);
    setNotes("");
    setCurrentIndex((i) => i + 1);
  }

  function shuffleQuestion() {
    if (!questions || questions.length === 0) return;
    setRevealed(false);
    setNotes("");
    setCurrentIndex(Math.floor(Math.random() * questions.length));
  }

  async function handleLog(result: InterviewAttemptResult) {
    if (!current) return;
    setLogging(result);
    try {
      await logInterviewAttempt(current.id, result, { notes: notes.trim() || undefined });
      await mutateWeaknesses();
      toast.success(
        result === "correct" ? "Logged — nice work" : "Logged — this concept is now tracked as a weakness"
      );
      nextQuestion();
    } catch {
      toast.error("Couldn't log attempt.");
    } finally {
      setLogging(null);
    }
  }

  const groupedWeaknesses = useMemo(() => {
    const map = new Map<string, NonNullable<typeof weaknesses>>();
    for (const w of weaknesses ?? []) {
      const key = w.technology_name ?? "General";
      const list = map.get(key) ?? [];
      list.push(w);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [weaknesses]);

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Interview Prep</h1>
        <p className="text-sm text-muted mt-1">
          Practice by round type, and track weak concepts automatically from your real answers.
        </p>
      </div>
      </FadeUp>

      <Card className="glow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" /> Practice
            </CardTitle>
            <Select
              value={roundType}
              onValueChange={(v) => {
                setRoundType(v as InterviewRoundType);
                setCurrentIndex(0);
                setRevealed(false);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_ROUND_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {questionsLoading && <Skeleton className="h-32 w-full" />}
          {!questionsLoading && (questions ?? []).length === 0 && (
            <p className="text-sm text-muted">No questions in the bank for this round type yet.</p>
          )}
          {!questionsLoading && current && (
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-4"
              >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{current.difficulty}</Badge>
                {current.concept_tag && <Badge variant="accent">{current.concept_tag}</Badge>}
                <Button size="sm" variant="ghost" onClick={shuffleQuestion} className="ml-auto">
                  <Shuffle className="h-3.5 w-3.5" /> Shuffle
                </Button>
              </div>
              <p className="text-base font-medium">{current.question}</p>

              {!revealed ? (
                <Button variant="outline" onClick={() => setRevealed(true)} className="self-start">
                  I&apos;ve answered — log my result
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Textarea
                    placeholder="Optional: jot what you actually said, or what you missed…"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleLog("correct")}
                      disabled={logging !== null}
                      variant="secondary"
                      className="flex-1"
                    >
                      {logging === "correct" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-success" />
                      )}
                      {ATTEMPT_RESULT_LABELS.correct}
                    </Button>
                    <Button
                      onClick={() => handleLog("partial")}
                      disabled={logging !== null}
                      variant="secondary"
                      className="flex-1"
                    >
                      {logging === "partial" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Minus className="h-4 w-4 text-warning" />
                      )}
                      {ATTEMPT_RESULT_LABELS.partial}
                    </Button>
                    <Button
                      onClick={() => handleLog("incorrect")}
                      disabled={logging !== null}
                      variant="secondary"
                      className="flex-1"
                    >
                      {logging === "incorrect" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 text-danger" />
                      )}
                      {ATTEMPT_RESULT_LABELS.incorrect}
                    </Button>
                  </div>
                </div>
              )}
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      <TimedInterviewSimulator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4" /> Weak concepts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {weaknessesLoading && <Skeleton className="h-24 w-full" />}
          {!weaknessesLoading && groupedWeaknesses.length === 0 && (
            <p className="text-sm text-muted">
              No weaknesses detected yet — practice a few questions above and any concept under 70% accuracy will
              show up here automatically.
            </p>
          )}
          <StaggerContainer className="flex flex-col gap-4">
          {groupedWeaknesses.map(([tech, items]) => (
            <StaggerItem key={tech}>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">{tech}</p>
              <div className="flex flex-col gap-1.5">
                {items.map((w) => (
                  <div
                    key={`${w.technology_id}-${w.concept_tag}`}
                    className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2"
                  >
                    <span className="text-sm flex-1">{w.concept_tag}</span>
                    <span className="text-xs text-muted font-mono-tabular">
                      {w.correct_count}/{w.attempts} correct
                    </span>
                    <Badge variant="danger">{w.accuracy_pct}%</Badge>
                    {w.linked_topic_id && (
                      <Badge variant="outline" className="text-[10px]" title="Feeds into Revision">
                        → revision
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </StaggerItem>
          ))}
          </StaggerContainer>
        </CardContent>
      </Card>
    </div>
  );
}
