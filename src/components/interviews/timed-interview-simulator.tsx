"use client";

import { useEffect, useMemo, useState } from "react";
import { useInterviewQuestions, logInterviewAttempt, ATTEMPT_RESULT_LABELS } from "@/lib/hooks/use-interview-prep";
import { INTERVIEW_ROUND_TYPES } from "@/lib/hooks/use-career";
import type { InterviewAttemptResult, InterviewRoundType } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, Clock3, Loader2, Minus, RotateCcw, X } from "lucide-react";

const DURATIONS = [15, 30, 45] as const;

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

/**
 * A focused, time-boxed interview round. It deliberately reuses the same
 * question bank and logInterviewAttempt mutation as ordinary practice, so a
 * timed result contributes to the same weakness/readiness analytics rather
 * than creating a parallel history.
 */
export function TimedInterviewSimulator() {
  const [roundType, setRoundType] = useState<InterviewRoundType>("technical");
  const { data: questions, isLoading } = useInterviewQuestions(roundType);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(30);
  const [secondsLeft, setSecondsLeft] = useState(duration * 60);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [notes, setNotes] = useState("");
  const [logging, setLogging] = useState<InterviewAttemptResult | null>(null);

  const current = useMemo(
    () => questions?.[index % Math.max(questions.length, 1)],
    [index, questions]
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          setRunning(false);
          setExpired(true);
          setRevealed(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function resetRound(nextDuration = duration) {
    setRunning(false);
    setExpired(false);
    setSecondsLeft(nextDuration * 60);
    setIndex(0);
    setRevealed(false);
    setNotes("");
  }

  function changeDuration(value: string) {
    const next = Number(value) as (typeof DURATIONS)[number];
    if (!DURATIONS.includes(next)) return;
    setDuration(next);
    resetRound(next);
  }

  function changeRoundType(value: string) {
    setRoundType(value as InterviewRoundType);
    resetRound();
  }

  function nextQuestion() {
    setIndex((value) => value + 1);
    setRevealed(false);
    setExpired(false);
    setNotes("");
    setSecondsLeft(duration * 60);
    setRunning(true);
  }

  async function handleLog(result: InterviewAttemptResult) {
    if (!current) return;
    setLogging(result);
    try {
      await logInterviewAttempt(current.id, result, { notes: notes.trim() || undefined });
      toast.success("Timed answer logged");
      nextQuestion();
    } catch {
      toast.error("Couldn't log timed answer.");
    } finally {
      setLogging(null);
    }
  }

  return (
    <Card className="border-accent/30">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" /> Timed simulator
          </CardTitle>
          <div className="flex gap-2">
            <Select value={roundType} onValueChange={changeRoundType}>
              <SelectTrigger className="w-40" aria-label="Timed simulator round type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_ROUND_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(duration)} onValueChange={changeDuration}>
              <SelectTrigger className="w-28" aria-label="Timed simulator duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-muted">Loading the question bank…</p>}
        {!isLoading && !current && <p className="text-sm text-muted">No questions are available for this round yet.</p>}
        {!isLoading && current && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{current.difficulty}</Badge>
                {current.concept_tag && <Badge variant="accent">{current.concept_tag}</Badge>}
              </div>
              <span
                className={`font-mono-tabular text-lg font-semibold ${secondsLeft <= 60 ? "text-danger" : "text-foreground"}`}
                aria-live="polite"
                aria-label={`${formatRemaining(secondsLeft)} remaining`}
              >
                {formatRemaining(secondsLeft)}
              </span>
            </div>
            <p className="text-base font-medium">{current.question}</p>
            {expired && <p className="text-xs text-danger">Time is up. Record the answer honestly, then continue to the next question.</p>}
            {!running && !revealed && (
              <Button onClick={() => setRunning(true)} className="self-start">
                <Clock3 className="h-4 w-4" /> {secondsLeft === duration * 60 ? "Start timed answer" : "Resume timer"}
              </Button>
            )}
            {running && !revealed && (
              <Button variant="outline" onClick={() => setRunning(false)} className="self-start">Pause timer</Button>
            )}
            {!running && !revealed && secondsLeft < duration * 60 && (
              <Button variant="ghost" onClick={() => resetRound()} className="self-start">
                <RotateCcw className="h-4 w-4" /> Reset round
              </Button>
            )}
            {revealed && (
              <div className="flex flex-col gap-3">
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="What did you say, miss, or want to improve?"
                  aria-label="Timed answer notes"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => handleLog("correct")} disabled={logging !== null} variant="secondary" className="flex-1">
                    {logging === "correct" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-success" />}
                    {ATTEMPT_RESULT_LABELS.correct}
                  </Button>
                  <Button onClick={() => handleLog("partial")} disabled={logging !== null} variant="secondary" className="flex-1">
                    {logging === "partial" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4 text-warning" />}
                    {ATTEMPT_RESULT_LABELS.partial}
                  </Button>
                  <Button onClick={() => handleLog("incorrect")} disabled={logging !== null} variant="secondary" className="flex-1">
                    {logging === "incorrect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 text-danger" />}
                    {ATTEMPT_RESULT_LABELS.incorrect}
                  </Button>
                </div>
              </div>
            )}
            {!revealed && !running && secondsLeft === 0 && (
              <Button variant="outline" onClick={() => resetRound()}>Start again</Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
