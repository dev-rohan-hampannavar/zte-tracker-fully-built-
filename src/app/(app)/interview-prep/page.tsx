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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
            <Brain className="h-4 w-4 text-accent" /> Typical interview loop (what to expect)
          </CardTitle>
          <CardDescription>Junior full-stack / SDE-1 at a Bangalore product startup. Source: career_timeline_zte.docx §32.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {([
              { round: "Online assessment (OA)", what: "1–2 DSA problems, 60–90 min, auto-graded. Mostly easy/easy-medium. Aim: solve both, clean code.", tip: "Practice on timed mode. If you see a graph problem and haven't done Phase 08 Block 5, skip and solve the array/string one first." },
              { round: "DSA round (1–2 rounds)", what: "1–2 problems, 45 min each, screenshare. Interviewer watches you think.", tip: "Use REACTO out loud. Say 'I'm thinking about...' at every step. Silence is worse than a wrong approach." },
              { round: "Machine coding (1–2 hr)", what: "Build a small feature or a mini app. Live coding, any language.", tip: "Start with the data model. Comment as you go. Deliver a working MVP first, then extend." },
              { round: "System design (senior / Staff — rare at SDE-1)", what: "Design a feed, a URL shortener, etc. Only at companies hiring experienced SDE-1s.", tip: "Know: load balancer, DB indexing, caching layer, CDN, sharding. ZTE Phase 17 covers this." },
              { round: "Hiring manager / behavioural", what: "Ops experience, motivation, culture fit. Why dev, why now, what you've shipped.", tip: "Have 5 STAR stories ready. One for each: impact, failure, conflict, learning, leadership." },
            ] as const).map((r) => (
              <div key={r.round} className="rounded-lg border border-border/50 p-3">
                <p className="text-sm font-medium">{r.round}</p>
                <p className="text-xs text-muted mt-1">{r.what}</p>
                <p className="text-xs text-accent mt-1.5">Tip: {r.tip}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted">Mock interview cadence: 1 timed mock per week from Phase 08 Block 3 onward. Record and rewatch one per week.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" /> 5 STAR stories from your ops experience
          </CardTitle>
          <CardDescription>Situation → Task → Action → Result. Write these before applications start. Ops experience is a differentiator — use it. Source: career_timeline_zte.docx §32.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { theme: "Impact", prompt: "A time you improved a metric, reduced cost, or saved time at Applied Materials. Quantify it (₹, %, hours)." },
              { theme: "Failure + learning", prompt: "A decision that went wrong and what you did next. Interviewers use this to test self-awareness." },
              { theme: "Conflict or disagreement", prompt: "When you disagreed with a colleague or manager. Focus on how you handled it, not who was right." },
              { theme: "Fast learning", prompt: "A skill or process you had to learn quickly under pressure. Ideal: tie to ZTE or any technical thing." },
              { theme: "Leadership without authority", prompt: "A time you drove an outcome without a formal mandate — coordinating across teams, vendors, or stakeholders." },
            ] as const).map((s) => (
              <div key={s.theme} className="rounded-lg border border-border/50 p-3">
                <p className="text-xs font-semibold text-accent">{s.theme}</p>
                <p className="text-xs text-muted mt-1">{s.prompt}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted">Write a 3-sentence version of each. Practice saying them out loud in under 90 seconds. If a story runs over 2 minutes, cut it.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" /> REACTO method per problem
          </CardTitle>
          <CardDescription>Use this for every timed DSA problem. Source: career_timeline_zte.docx §32.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {([
              { step: "R — Restate", action: "Say the problem back in your own words. Confirm edge cases (empty input, negatives, single element)." },
              { step: "E — Examples", action: "Write 2–3 input/output pairs. One normal, one edge case. Do not skip this." },
              { step: "A — Approach", action: "Talk through brute-force first, then improve. State time and space complexity before coding." },
              { step: "C — Code", action: "Write clean, named-variable code. Talk as you type. Don't use `i` for a variable that means 'row index'." },
              { step: "T — Test", action: "Trace through your examples manually. Find the bug before the interviewer does." },
              { step: "O — Optimise", action: "If time permits: can you improve? If not: say what you'd do with more time." },
            ] as const).map((r) => (
              <div key={r.step} className="flex gap-3 py-2 border-b border-border/30 last:border-0">
                <span className="text-xs font-mono font-semibold text-accent w-32 shrink-0">{r.step}</span>
                <p className="text-xs text-muted">{r.action}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-3">25-minute cutoff rule: if you haven't reached T (test) in 25 minutes, say "I'll outline the rest" and walk through the logic verbally. Never go silent for more than 30 seconds.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" /> Offer negotiation rules
          </CardTitle>
          <CardDescription>Source: career_timeline_zte.docx §19.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-xs text-muted">
            <li className="flex gap-2"><span className="text-accent font-semibold shrink-0">1.</span>Never give a number first. Say: <span className="text-foreground">"What is the budgeted range for this role?"</span></li>
            <li className="flex gap-2"><span className="text-accent font-semibold shrink-0">2.</span>Compare fixed pay, not CTC. Variable, joining bonus and ESOPs are not spendable income — they're often zero.</li>
            <li className="flex gap-2"><span className="text-accent font-semibold shrink-0">3.</span>Value ESOPs at ₹0 when comparing. Treat any vested value above zero as upside.</li>
            <li className="flex gap-2"><span className="text-accent font-semibold shrink-0">4.</span>Use your ops experience: <span className="text-foreground">"I have 2 years of professional experience and ship production code in ClientSync."</span></li>
            <li className="flex gap-2"><span className="text-accent font-semibold shrink-0">5.</span>Pay up to ~₹12.75L/year is effectively tax-free under the new regime (FY2025-26). Factor this when comparing offers.</li>
            <li className="flex gap-2"><span className="text-accent font-semibold shrink-0">6.</span>Get it in writing: base, variable, joining bonus, notice period during probation, and probation length.</li>
            <li className="flex gap-2"><span className="text-accent font-semibold shrink-0">7.</span>Switch only when the offer beats your current ops pay. If it doesn't, keep studying to the next exit — your floor is already funded.</li>
          </ul>
        </CardContent>
      </Card>

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
