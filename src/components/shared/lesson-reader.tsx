"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lesson } from "@/content/shared/lessons/types";
import { useLessonProgress } from "@/lib/hooks/use-lesson-progress";
import { getErrorMessage } from "@/lib/error-message";

function Bullets({ items, mark = "•" }: { items: string[]; mark?: string }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((i) => <li key={i} className="flex gap-2"><span className="text-accent">{mark}</span><span>{i}</span></li>)}
    </ul>
  );
}

export function LessonReader({ lesson, userId, next }: { lesson: Lesson; userId: string; next?: Lesson }) {
  const { progress, markComplete } = useLessonProgress(userId);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const done = progress[lesson.id];
  const correct = lesson.quiz.filter((q, i) => picked[i] === q.answer).length;
  const allAnswered = lesson.quiz.every((_, i) => picked[i] !== undefined);

  async function complete() {
    setSaving(true);
    try {
      await markComplete(lesson.id, correct, lesson.quiz.length);
      toast.success("Lesson complete");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't save your progress. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/learn" className="text-xs text-accent hover:underline">← All lessons</Link>
        <h1 className="mt-2 text-page-title font-semibold tracking-tight">{lesson.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge variant="outline">{lesson.module}</Badge>
          <span>{lesson.minutes} min</span>
          {done && <Badge variant="outline" className="border-success/40 text-success">Completed · quiz {done.quiz_correct}/{done.quiz_total}</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">What you&apos;ll be able to do</CardTitle></CardHeader>
        <CardContent><Bullets items={lesson.objectives} mark="✓" /></CardContent>
      </Card>

      <section className="space-y-3 text-sm leading-relaxed">
        {lesson.explain.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
      </section>

      <Card className="border-accent/20">
        <CardHeader className="pb-2"><CardTitle className="text-base">Key ideas</CardTitle></CardHeader>
        <CardContent><Bullets items={lesson.keyIdeas} /></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Worked example: {lesson.example.title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {lesson.example.code && (
            <pre className="overflow-x-auto rounded-md bg-surface-2 p-3 text-xs leading-relaxed" aria-label={`${lesson.example.lang ?? "code"} example`}>
              <code>{lesson.example.code}</code>
            </pre>
          )}
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Walkthrough</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {lesson.example.walkthrough.map((w) => <li key={w}>{w}</li>)}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Practise</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {lesson.practice.map((p) => (
            <div key={p.task} className="rounded-lg border border-border/60 p-3">
              <p>{p.task}</p>
              <details className="mt-2 text-muted">
                <summary className="cursor-pointer text-xs text-accent">Show a hint</summary>
                <p className="mt-1">{p.hint}</p>
              </details>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Check your understanding</CardTitle></CardHeader>
        <CardContent className="space-y-5 text-sm">
          {lesson.quiz.map((q, qi) => (
            <fieldset key={q.q} className="space-y-2">
              <legend className="font-medium">{qi + 1}. {q.q}</legend>
              {q.options.map((opt, oi) => {
                const isPicked = picked[qi] === oi;
                const isRight = checked && oi === q.answer;
                const isWrong = checked && isPicked && oi !== q.answer;
                return (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 ${isRight ? "border-success/50 bg-success/5" : isWrong ? "border-danger/50 bg-danger/5" : isPicked ? "border-accent/50" : "border-border/60"}`}
                  >
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={isPicked}
                      disabled={checked}
                      onChange={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                      className="mt-1"
                    />
                    <span className="flex-1">{opt}</span>
                    {isRight && <Check className="size-4 text-success" aria-label="correct" />}
                    {isWrong && <X className="size-4 text-danger" aria-label="incorrect" />}
                  </label>
                );
              })}
              {checked && <p className="rounded-md bg-surface-2 p-2 text-xs text-muted">{q.why}</p>}
            </fieldset>
          ))}
          {!checked ? (
            <Button onClick={() => setChecked(true)} disabled={!allAnswered}>Check answers</Button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-medium">Score: {correct}/{lesson.quiz.length}</p>
              {correct < lesson.quiz.length && (
                <Button variant="outline" onClick={() => { setPicked({}); setChecked(false); }}>Try again</Button>
              )}
              {correct < Math.ceil(lesson.quiz.length * 0.67) && (
                <span className="text-xs text-muted">Re-read the key ideas above, then try again before moving on.</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Common mistakes</CardTitle></CardHeader>
        <CardContent><Bullets items={lesson.pitfalls} mark="✕" /></CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 pb-8">
        <Button onClick={complete} disabled={!checked || saving || !!done}>
          {done ? "Completed" : saving ? "Saving…" : "Mark lesson complete"}
        </Button>
        {!checked && !done && <span className="text-xs text-muted">Answer the quiz to finish this lesson.</span>}
        {next && (
          <Link href={`/learn/${next.id}`} className="text-sm text-accent hover:underline">Next: {next.title} →</Link>
        )}
      </div>
    </article>
  );
}
