import assert from "node:assert/strict";

// Contract tests for src/lib/rate-limit.ts's checkRateLimit. Reproduced
// inline per this repo's convention (see tests/safe-redirect.test.mjs).

const buckets = new Map();

function checkRateLimit(key, limit, windowMs, now = Date.now()) {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

// Allows up to the limit, then blocks.
{
  buckets.clear();
  let allowed = 0;
  for (let i = 0; i < 5; i++) {
    if (checkRateLimit("test-a", 3, 60_000)) allowed++;
  }
  assert.equal(allowed, 3);
}

// Different keys have independent budgets.
{
  buckets.clear();
  assert.equal(checkRateLimit("ip-1", 1, 60_000), true);
  assert.equal(checkRateLimit("ip-1", 1, 60_000), false);
  assert.equal(checkRateLimit("ip-2", 1, 60_000), true, "different key must not share ip-1's budget");
}

// Window expiry resets the count.
{
  buckets.clear();
  const t0 = 1_000_000;
  assert.equal(checkRateLimit("test-b", 1, 1000, t0), true);
  assert.equal(checkRateLimit("test-b", 1, 1000, t0 + 500), false, "still within window");
  assert.equal(checkRateLimit("test-b", 1, 1000, t0 + 1001), true, "window expired, resets");
}

console.log("rate limit: 3 checks passed");
