import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`;
}

export function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 1000) / 10;
}

// Local-calendar-day ISO string ("YYYY-MM-DD"), NOT UTC. toISOString()
// converts to UTC first, so for any timezone behind UTC (all of the
// Americas, for example), logging late at night got stamped with
// tomorrow's date — silently breaking "today" comparisons in the journal
// and corrupting streak continuity in computeStreak. Building the string
// from local getFullYear/getMonth/getDate avoids the UTC conversion.
export function todayISO(): string {
  return localDateISO(new Date());
}

export function localDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
