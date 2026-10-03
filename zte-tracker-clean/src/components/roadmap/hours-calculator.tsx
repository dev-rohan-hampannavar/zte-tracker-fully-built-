"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Info } from "lucide-react";
import { formatHours } from "@/lib/utils";

/**
 * Stage 3 — Item 22: Realistic Hours Calculator — interactive.
 *
 * The static weekly_pace_options table (rendered just above this on
 * /reference) is sourced content and stays as-is per the plan's explicit
 * instruction ("show the result against the existing static table for
 * comparison, rather than replacing it"). This is the interactive
 * complement: enter hrs/week, see a projected completion date, computed
 * from the person's own remaining hours — not a re-statement of the
 * source's own timeline estimates for a generic learner.
 */
export function HoursCalculator({
  totalHours,
  completedHours,
}: {
  totalHours: number;
  completedHours: number;
}) {
  const [hoursPerWeek, setHoursPerWeek] = useState("10");

  const remainingHours = Math.max(0, totalHours - completedHours);
  const parsed = parseFloat(hoursPerWeek);
  const validRate = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  const weeks = validRate ? remainingHours / validRate : null;
  const completionDate = weeks
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + Math.ceil(weeks * 7));
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      })()
    : null;

  // Scenario comparison (master spec: "10 hrs/week → completion A, 20 →
  // B, 25 → C"). Fixed reference rates rather than re-deriving from the
  // person's own custom rate above — the point is to show how the SAME
  // remaining-hours figure plays out at a few common paces side by side,
  // not to duplicate whatever they just typed in.
  const scenarioRates = [10, 20, 25];
  const scenarios = scenarioRates.map((rate) => {
    const scenarioWeeks = remainingHours / rate;
    const d = new Date();
    d.setDate(d.getDate() + Math.ceil(scenarioWeeks * 7));
    return {
      rate,
      weeks: Math.ceil(scenarioWeeks),
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Your completion date
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label htmlFor="hours-per-week">Hours per week</Label>
            <Input
              id="hours-per-week"
              type="number"
              min="1"
              step="0.5"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              className="w-28 mt-1"
            />
          </div>
          <div className="text-sm text-muted">
            <span className="font-mono-tabular text-foreground">{formatHours(remainingHours)}</span> remaining
            {completedHours > 0 && (
              <span>
                {" "}
                (of <span className="font-mono-tabular">{formatHours(totalHours)}</span> total —{" "}
                <span className="font-mono-tabular">{formatHours(completedHours)}</span> already logged)
              </span>
            )}
          </div>
        </div>

        {validRate ? (
          <div className="rounded-md bg-surface-2 p-3 flex flex-col gap-1">
            <p className="text-sm">
              At <span className="font-mono-tabular font-medium">{validRate}</span> hrs/week, you&apos;ll finish
              around{" "}
              <span className="font-medium text-accent">{completionDate}</span>
              {" "}(~<span className="font-mono-tabular">{Math.ceil(weeks!)}</span> weeks from today).
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">Enter a positive number of hours per week.</p>
        )}

        <div>
          <p className="text-xs text-muted uppercase tracking-wide mb-2">Compare a few paces</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {scenarios.map((s) => (
              <div key={s.rate} className="rounded-md border border-border p-3 flex flex-col gap-1">
                <p className="text-sm font-medium font-mono-tabular">{s.rate} hrs/week</p>
                <p className="text-xs text-muted">
                  Finish <span className="text-foreground">{s.date}</span>
                </p>
                <p className="text-xs text-muted">~{s.weeks} weeks</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Based on your own remaining estimated hours across all topics, not the source
            document&apos;s generic weekly-pace table above — assumes a constant weekly pace with no
            breaks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
