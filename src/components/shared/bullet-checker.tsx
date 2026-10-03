"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { analyzeBullet } from "@/lib/resume-bullets";

/** Paste a resume bullet and get instant, specific feedback. Runs locally. */
export function BulletChecker() {
  const [text, setText] = useState("");
  const result = analyzeBullet(text);
  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Bullet checker</CardTitle>
        <p className="text-sm text-muted">Paste one resume bullet. Nothing leaves your browser.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          aria-label="Resume bullet"
          placeholder="e.g. Built a REST API with Node.js and PostgreSQL that cut report time from 3 minutes to 20 seconds"
          className="w-full rounded-md border border-border bg-surface p-3 text-sm outline-none focus:border-accent"
        />
        {text.trim() && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Score {result.score}/100</span>
              <Progress value={result.score} label="Bullet strength" className="flex-1" />
              <span className="text-xs text-muted">{result.words} words</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {result.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  {c.passed ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="passed" /> : <X className="mt-0.5 size-4 shrink-0 text-danger" aria-label="needs work" />}
                  <span>
                    {c.label}
                    {!c.passed && <span className="block text-xs text-muted">{c.tip}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
