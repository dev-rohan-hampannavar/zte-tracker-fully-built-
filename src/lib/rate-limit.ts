/**
 * PHASE 20 — production hardening: rate limiting.
 *
 * Honest limitation, stated up front: this is a single-instance,
 * in-memory limiter. It resets on every deploy/cold start and does not
 * share state across multiple server instances or edge regions. Real
 * protection against a distributed attacker needs a shared store
 * (Upstash Redis, Vercel KV, or similar) — none is configured in this
 * project, and adding one is an infrastructure/billing decision, not
 * something to introduce silently in a hardening pass. This still adds
 * real value against casual/single-source abuse of the one genuinely
 * unauthenticated data-returning route in this codebase
 * (/api/public/[slug], which already caches for 5 minutes per slug via
 * `revalidate = 300` — this limiter's job is the gap that cache doesn't
 * cover: many different slugs hit rapidly from one source).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so `buckets` doesn't grow unbounded over a long-lived
// server process — checked opportunistically on each call rather than a
// separate timer, since a timer would keep the process alive
// unnecessarily in serverless environments.
function sweepExpired(now: number) {
  if (buckets.size < 500) return; // cheap check, avoid sweeping on every call
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * Returns true if the request should be allowed, false if it's over the
 * limit. `key` should identify the caller (IP address) plus the route,
 * so different routes get independent budgets.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/** Best-effort caller IP from standard proxy headers (Vercel sets
 * x-forwarded-for). Falls back to a constant key if neither is present —
 * meaning that request shares a global budget with other IP-less
 * requests rather than bypassing the limit entirely. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
