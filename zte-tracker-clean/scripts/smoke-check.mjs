#!/usr/bin/env node

const paths = ["/api/health", "/login", "/welcome", "/career-plan", "/execution"];

export async function runSmoke({
  base = process.env.SMOKE_BASE_URL || "http://localhost:3000",
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const normalizedBase = base.replace(/\/$/, "");
  const failures = [];

  for (const path of paths) {
    try {
    // Follow the deployment's canonical-host redirect (typically a 308 from
    // apex to www) so the probe validates the application response rather
    // than failing on an expected edge redirect. This script only requests
    // fixed same-origin paths; it never accepts a user-supplied redirect.
    const response = await fetchImpl(`${normalizedBase}${path}`, { redirect: "follow" });
    // /api/health is 200 only when Supabase service-role credentials are
    // configured; 503 is still a useful dependency signal, not a transport
    // failure. The page routes may redirect unauthenticated users to /login.
    if (path === "/api/health") {
      const finalPath = new URL(response.url).pathname;
      if (finalPath !== path) {
        failures.push(`${path} redirected to ${finalPath}; health must remain public`);
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        failures.push(`${path} returned ${contentType || "no content type"}, expected JSON`);
        continue;
      }
      let payload;
      try {
        payload = await response.json();
      } catch {
        failures.push(`${path} returned invalid JSON`);
        continue;
      }
      const statusMatches =
        (response.status === 200 && payload?.status === "ok") ||
        (response.status === 503 && payload?.status === "degraded");
      if (!statusMatches || !payload?.dependencies?.database) {
        failures.push(`${path} returned an invalid health payload (${response.status})`);
        continue;
      }
      log(`smoke ${path}: ${response.status} (${payload.status})`);
      continue;
    }
    const allowed = response.status >= 200 && response.status < 400;
    if (!allowed) failures.push(`${path} returned ${response.status}`);
    else log(`smoke ${path}: ${response.status}`);
    } catch (error) {
      failures.push(`${path} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { failures, base: normalizedBase, count: paths.length };
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  const result = await runSmoke();
  if (result.failures.length > 0) {
    console.error(result.failures.join("\n"));
    process.exit(1);
  }

  console.log(`smoke check passed: ${result.count} endpoints reachable at ${result.base}`);
}
