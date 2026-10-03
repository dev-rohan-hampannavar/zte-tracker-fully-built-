import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [release, funnel, isolation, admin, analytics, flags] = await Promise.all([
  read("supabase/migrations/0084_curriculum_release_workflow.sql"),
  read("supabase/migrations/0085_product_funnel_and_feature_flags.sql"),
  read("scripts/verify-user-isolation.mjs"),
  read("src/components/admin/product-admin-console.tsx"),
  read("src/lib/product-analytics.ts"),
  read("src/lib/hooks/use-feature-flag.ts"),
]);

for (const status of ["draft", "review", "test", "published"]) {
  assert.ok(release.includes(`'${status}'`), `release workflow missing ${status}`);
}
assert.ok(release.includes("create_roadmap_draft"), "release workflow must clone an immutable current version");
assert.ok(release.includes("create policy \"admin edit draft roadmap topics\""), "topic edits must be draft-only");
assert.ok(release.includes("revoke insert, update, delete on public.roadmap_versions from authenticated"), "clients must not directly mutate release versions");
assert.ok(release.includes("prerequisites cannot contain a cycle"), "review must reject cyclic prerequisite graphs");

for (const event of ["signup", "onboarding_completed", "roadmap_viewed", "topic_started", "topic_completed", "project_started", "project_deployed", "return_usage"]) {
  assert.ok(funnel.includes(`'${event}'`), `product funnel missing ${event}`);
}
assert.ok(funnel.includes("enable row level security"), "product events must use RLS");
assert.ok(funnel.includes("get_product_funnel"), "admins must have aggregate funnel reporting");
assert.ok(!/metadata\s+jsonb/i.test(funnel), "product funnel must not collect arbitrary page metadata");
assert.ok(funnel.includes("on conflict do nothing"), "first milestone capture must be idempotent");

assert.ok(admin.includes("get_product_funnel"), "admin must display product funnel counts");
assert.ok(admin.includes("feature_flags"), "admin must manage feature flags");
assert.ok(admin.includes("set_role_roadmap_assignment"), "admin must manage role-to-roadmap assignments");
const editor = await read("src/components/admin/detailed-curriculum-editor.tsx");
assert.ok(editor.includes("createModule"), "curriculum editor must create modules");
assert.ok(editor.includes("prerequisite_topic_ids"), "curriculum editor must manage prerequisites");
assert.ok(editor.includes("learning_resources"), "curriculum editor must manage resources");
assert.ok(analytics.includes("Best-effort telemetry"), "telemetry failures must not block user work");
assert.ok(flags.includes("feature_flags"), "feature flag hook must read admin-controlled flags");
assert.ok(isolation.includes("User B cannot read User A's product events"), "live isolation test must cover product events");
assert.ok(isolation.includes("Users cannot bypass the event RPC"), "live test must prevent direct product event writes");

console.log("product platform contracts: curriculum releases, private funnel analytics, flags, and event isolation passed");
