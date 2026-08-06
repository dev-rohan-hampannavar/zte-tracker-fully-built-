"use client";

import { useMemo, useState } from "react";
import type { DailyLog } from "@/types/database";
import { cn, localDateISO } from "@/lib/utils";

function intensity(hours: number): number {
  if (hours <= 0) return 0;
  if (hours < 1) return 1;
  if (hours < 3) return 2;
  if (hours < 5) return 3;
  return 4;
}

export function StudyHeatmap({ logs }: { logs: DailyLog[] }) {
  const [hovered, setHovered] = useState<{ date: string; hours: number } | null>(null);

  const map = useMemo(() => {
    const m = new Map<string, number>();
    logs.forEach((l) => m.set(l.date, Number(l.hours)));
    return m;
  }, [logs]);

  const weeks = useMemo(() => {
    const days: { date: string; hours: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 371); // ~53 weeks

    // Align start to a Sunday
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    const cursor = new Date(start);
    while (cursor <= today) {
      // localDateISO, not toISOString() — the latter converts to UTC first,
      // which misaligns the whole grid by a day for timezones behind UTC.
      const iso = localDateISO(cursor);
      days.push({ date: iso, hours: map.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const w: { date: string; hours: number }[][] = [];
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7));
    return w;
  }, [map]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                onMouseEnter={() => setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "h-[11px] w-[11px] rounded-[2px] cursor-default",
                  `heat-${intensity(day.hours)}`
                )}
                title={`${day.date}: ${day.hours}h`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{hovered ? `${hovered.date} · ${hovered.hours}h logged` : "Hover a cell for details"}</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("h-[10px] w-[10px] rounded-[2px]", `heat-${i}`)} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
