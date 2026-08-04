/**
 * Stage 2 — Item 20: Smart Filters — domain taxonomy.
 *
 * No `domain` field exists anywhere in the source roadmap data (confirmed:
 * no per-topic or per-phase tech tag in the schema). Rather than fabricate
 * a domain column with no source basis, this derives a best-effort domain
 * tag per phase from its title using a keyword heuristic. It is explicitly
 * an inferred, client-side label — not sourced data — and is presented as
 * such in the UI (see the "(inferred)" suffix used wherever this is shown).
 *
 * A phase can match zero or multiple domains. Zero matches is a legitimate
 * outcome for phases whose titles don't cleanly signal a single domain
 * (e.g. "TypeScript Mastery", "Engineering Craft + Package Publishing") —
 * those are left untagged rather than forced into a bucket that doesn't fit.
 */

export const DOMAINS = [
  "Frontend",
  "Backend",
  "DevOps",
  "Database",
  "Testing",
  "AI",
  "Infrastructure",
  "DSA",
  "Career",
] as const;

export type Domain = (typeof DOMAINS)[number];

// Keyword lists are matched as whole words against the lowercased phase
// title. Short/ambiguous tokens ("ai", "dsa") use word-boundary regex to
// avoid false positives from substrings inside other words (e.g. "ai"
// inside "payments", "api" inside "Apis").
const DOMAIN_KEYWORDS: Record<Domain, RegExp[]> = {
  Frontend: [/react/, /next\.js/, /\bui\b/, /styling/, /css/, /browser/, /collaboration/, /native/],
  Backend: [/backend/, /\bapi\b/, /real-time/, /caching/, /email/, /payments/, /search/],
  DevOps: [/ci\/cd/, /deployment/, /build tooling/, /load testing/],
  Database: [/database/, /postgresql/],
  Testing: [/testing/],
  AI: [/\bai\b/, /rag/],
  Infrastructure: [/infrastructure/, /architectural/, /security/],
  DSA: [/\bdsa\b/, /interview/],
  Career: [/career/, /community/],
};

/** Derive the inferred domain tags for a single phase title. */
export function inferDomains(phaseTitle: string): Domain[] {
  const title = phaseTitle.toLowerCase();
  return DOMAINS.filter((domain) => DOMAIN_KEYWORDS[domain].some((re) => re.test(title)));
}
