import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migration = await readFile(resolve(root, "supabase/migrations/0054_study_events_and_completion.sql"), "utf8");
const readinessMigration = await readFile(resolve(root, "supabase/migrations/0055_bi_data_readiness.sql"), "utf8");
const settings = await readFile(resolve(root, "src/app/(app)/settings/page.tsx"), "utf8");
const serviceWorker = await readFile(resolve(root, "public/sw.js"), "utf8");
const jobAnalyzer = await readFile(resolve(root, "src/lib/job-description-analysis.ts"), "utf8");
const jobReadinessPage = await readFile(resolve(root, "src/app/(app)/job-readiness/page.tsx"), "utf8");
const welcomePage = await readFile(resolve(root, "src/app/welcome/page.tsx"), "utf8");
const middleware = await readFile(resolve(root, "src/lib/supabase/middleware.ts"), "utf8");
const smoke = await readFile(resolve(root, "scripts/smoke-check.mjs"), "utf8");
const smokeTest = await readFile(resolve(root, "tests/smoke-check.test.mjs"), "utf8");
const weeklySummaryCron = await readFile(resolve(root, "src/app/api/cron/weekly-summary/route.ts"), "utf8");
const resetProgressMigration = await readFile(resolve(root, "supabase/migrations/0086_fix_reset_financial_profile.sql"), "utf8");

// These are executable contract checks for the highest-risk cross-cutting
// guarantees. Full RLS/transaction assertions still run against Supabase in
// deployment acceptance, but this catches accidental removal in CI.
for (const required of [
  "create table if not exists public.study_events",
  "create or replace function public.record_study_activity",
  "create or replace function public.record_study_session",
  "create or replace function public.set_topic_completion",
  "guard_topic_completion",
  "create or replace function public.complete_focus_session",
  "delete from public.notification_dismissals where user_id = caller",
]) {
  assert.ok(migration.includes(required), `migration contract missing: ${required}`);
}

for (const required of [
  "const EXPORT_VERSION = 5",
  "weekly_commitments",
  "time_blocks",
  "evidence_items",
  "study_events",
  "normalizeHttpUrl(row.url)",
]) {
  assert.ok(settings.includes(required), `backup contract missing: ${required}`);
}

assert.ok(serviceWorker.includes("Never cache HTML"), "service worker must document authenticated HTML cache isolation");
assert.ok(readinessMigration.includes("bi-data-analyst"), "readiness contract missing BI/data role");
assert.ok(jobAnalyzer.includes("analyzeJobDescription"), "job-description analyzer contract missing");
assert.ok(jobReadinessPage.includes("Job description analyzer"), "job-readiness analyzer UI contract missing");
assert.ok(welcomePage.includes("ZTE Tracker turns the Zero to Elite curriculum"), "welcome copy fallback missing");
assert.ok(middleware.includes("const isHealthRoute"), "health route must be explicitly public");
assert.ok(smoke.includes("health must remain public"), "smoke check must reject a login redirect for health");
assert.ok(smokeTest.includes("public JSON health payload accepted"), "smoke behavior test missing");

// The weekly-summary cron route has no caller session — only a shared
// bearer secret — so its JSON response is effectively as exposed as
// anything an external pinger logs. It must fail closed on a missing
// secret and must never return raw user_id values or per-recipient error
// text; only aggregate counts belong in the response body.
assert.ok(
  weeklySummaryCron.includes('!process.env.CRON_SECRET') &&
    weeklySummaryCron.includes('status: 500'),
  "weekly-summary cron must fail closed when CRON_SECRET is unset"
);
assert.ok(
  !/NextResponse\.json\(\{\s*weekStart,\s*weekEnd,\s*results\s*\}\)/.test(weeklySummaryCron),
  "weekly-summary cron response must not leak the per-user results array (user_id, error text)"
);
assert.ok(
  weeklySummaryCron.includes("sent, skipped, failed, total"),
  "weekly-summary cron must return aggregate-only counts"
);
console.log("production contracts: study-event, completion-guard, backup, PWA, job-analyzer, welcome-copy, health, and weekly-summary privacy checks passed");

// reset_user_progress() must clear every table that Settings' export/import
// (backup) round-trip treats as personal/progress data — otherwise "Reset
// progress" silently leaves that data behind while the UI implies a full
// reset. financial_profiles was the concrete gap found and fixed in
// migration 0086; this test pins that fix and gives future additions to
// the backup domain list a corresponding check to update.
for (const table of [
  "delete from public.financial_profiles where user_id = caller",
  "delete from public.evidence_items where user_id = caller",
  "delete from public.career_tracker where user_id = caller",
]) {
  assert.ok(resetProgressMigration.includes(table), `reset_user_progress must clear: ${table}`);
}
console.log("reset_user_progress contract: financial_profiles (and existing career/evidence tables) confirmed cleared");
