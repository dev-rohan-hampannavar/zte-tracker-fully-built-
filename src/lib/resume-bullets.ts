// Deterministic resume-bullet checker. It scores a bullet against the habits
// recruiters scan for: a strong opening verb, a concrete result, a named tool
// or method, sensible length, and no filler. No network, no AI.

export interface BulletCheck {
  id: "verb" | "metric" | "tech" | "length" | "filler" | "voice";
  label: string;
  passed: boolean;
  tip: string;
}

export interface BulletAnalysis {
  score: number; // 0–100
  words: number;
  checks: BulletCheck[];
}

const STRONG_VERBS = new Set(
  [
    "built", "designed", "implemented", "reduced", "increased", "shipped", "automated", "migrated", "led", "optimized",
    "optimised", "created", "developed", "launched", "refactored", "integrated", "wrote", "deployed", "improved",
    "analyzed", "analysed", "resolved", "delivered", "cut", "scaled", "streamlined", "architected", "debugged",
    "tested", "documented", "mentored", "coordinated", "negotiated", "established", "introduced", "replaced",
    "eliminated", "accelerated", "simplified", "configured", "instrumented", "secured", "modelled", "modeled",
    "owned", "drove", "rebuilt", "extended", "published", "presented", "trained", "organised", "organized",
  ]
);

const TECH = /\b(react|next\.?js|node(\.?js)?|express|typescript|javascript|python|java|spring|sql|postgres(ql)?|mysql|mongo(db)?|redis|docker|kubernetes|aws|gcp|azure|api|rest|graphql|git|github|ci\/cd|jest|vitest|cypress|tailwind|css|html|django|flask|fastapi|kafka|rabbitmq|terraform|linux|excel|power ?bi|tableau|pandas|numpy|figma|jira|oauth|jwt|websocket)s?\b/i;

const FILLER = /\b(responsible for|worked on|helped (with|to)|assisted (with|in)|involved in|duties included|various|etc\.?|hard[- ]working|team player|passionate)\b/i;

export function analyzeBullet(input: string): BulletAnalysis {
  const text = input.trim().replace(/^[-•*]\s*/, "");
  const words = text ? text.split(/\s+/).length : 0;
  const first = (text.split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");

  const checks: BulletCheck[] = [
    {
      id: "verb",
      label: "Starts with a strong action verb",
      passed: STRONG_VERBS.has(first),
      tip: "Open with what you did: Built, Reduced, Shipped, Automated, Led.",
    },
    {
      id: "metric",
      label: "Shows a measurable result",
      passed: /\d/.test(text),
      tip: "Add a number: time saved, % improvement, users, requests, money, or team size. An honest estimate beats none.",
    },
    {
      id: "tech",
      label: "Names the tool or method",
      passed: TECH.test(text),
      tip: "Say how you did it: the language, framework, service or technique.",
    },
    {
      id: "length",
      label: "Is 8–30 words",
      passed: words >= 8 && words <= 30,
      tip: words < 8 ? "Too short: add the how and the result." : "Too long: split it or cut the backstory.",
    },
    {
      id: "filler",
      label: "Avoids filler phrases",
      passed: text.length > 0 && !FILLER.test(text),
      tip: "Replace 'responsible for' or 'worked on' with the specific action you took.",
    },
    {
      id: "voice",
      label: "Avoids first-person pronouns",
      passed: text.length > 0 && !/^(i|my|we|our)\b/i.test(text),
      tip: "Resume bullets imply 'I'. Start with the verb instead.",
    },
  ];

  const score = text ? Math.round((checks.filter((c) => c.passed).length / checks.length) * 100) : 0;
  return { score, words, checks };
}
