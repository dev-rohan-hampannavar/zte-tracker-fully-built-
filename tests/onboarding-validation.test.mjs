import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateOnboardingStep,
  firstInvalidStep,
  parseWeeklyHours,
  roleMatchesQuery,
  isValidIsoDate,
  addMonthsIso,
  toLocalIso,
} from "../src/lib/onboarding-validation.ts";
import { parseAuthHashError } from "../src/lib/auth-hash-error.ts";

// 1. Role step must not pass without a selected role (typing in the search box is not a selection).
assert.ok(validateOnboardingStep("role", {}), "empty role must be rejected");
assert.equal(validateOnboardingStep("role", { target_role_id: "bi-data-analyst" }), null);
assert.ok(
  validateOnboardingStep("role", { target_role_id: "gone" }, { validRoleIds: new Set(["bi-data-analyst"]) }),
  "unknown role must be rejected"
);

// 2. Other required steps.
assert.ok(validateOnboardingStep("goal", {}));
assert.ok(validateOnboardingStep("goal", { goal: "other", goal_other: "  " }));
assert.equal(validateOnboardingStep("goal", { goal: "other", goal_other: "ship" }), null);
for (const [step, key] of [["experience", "experience_level"], ["dsa", "dsa_level"], ["interview", "interview_readiness"], ["situation", "career_situation"]]) {
  assert.ok(validateOnboardingStep(step, {}), `${step} required`);
  assert.equal(validateOnboardingStep(step, { [key]: "beginner" }), null);
}

// 3. Hours and dates.
for (const bad of [undefined, NaN, 0, -3, 81]) assert.ok(validateOnboardingStep("hours", { weekly_hours: bad }), `hours ${bad}`);
assert.equal(validateOnboardingStep("hours", { weekly_hours: 10 }), null);
assert.equal(parseWeeklyHours(""), undefined);
assert.equal(parseWeeklyHours("abc"), undefined);
assert.equal(parseWeeklyHours("-4"), 0);
assert.equal(parseWeeklyHours("9999"), 80);
assert.equal(isValidIsoDate("2026-02-30"), false);
assert.ok(validateOnboardingStep("date", { target_date: "2026-02-30" }, { today: "2026-01-01" }));
assert.ok(validateOnboardingStep("date", { target_date: "2020-01-01" }, { today: "2026-01-01" }));
assert.equal(validateOnboardingStep("date", { target_date: "2027-01-01" }, { today: "2026-01-01" }), null);

// 3b. Local-date math (bug: toISOString() shifted dates a day early for IST users).
assert.equal(toLocalIso(new Date(2026, 11, 30)), "2026-12-30");
assert.equal(addMonthsIso(new Date(2026, 8, 30), 3), "2026-12-30");
assert.equal(addMonthsIso(new Date(2026, 7, 31), 6), "2027-02-28");
assert.equal(addMonthsIso(new Date(2026, 9, 31), 4), "2027-02-28");

// 4. Whole-draft check reports the first failing step.
assert.equal(firstInvalidStep({}).step, "goal");
assert.equal(firstInvalidStep({ goal: "first_job" }).step, "role");

// 5. Typo-tolerant role search (the screenshot bug: "Data anlayst" matched nothing).
assert.ok(roleMatchesQuery("Data Analyst", "Data anlayst"));
assert.ok(roleMatchesQuery("Frontend Developer", "fron"));
assert.ok(!roleMatchesQuery("Data Scientist", "Data anlayst"));
assert.ok(roleMatchesQuery("Anything", "   "));

// 6. Auth hash errors are parsed (and unrelated hashes ignored).
assert.match(parseAuthHashError("#error=access_denied&error_code=otp_expired&error_description=x"), /expired/i);
assert.equal(parseAuthHashError("#section-3"), null);
assert.equal(parseAuthHashError(""), null);

// 7. Wiring contracts.
const page = readFileSync(new URL("../src/app/onboarding/page.tsx", import.meta.url), "utf8");
assert.match(page, /validateOnboardingStep\(step, answers/, "Next must validate the current step");
assert.match(page, /firstInvalidStep\(answers/, "submit must re-validate the whole draft");
const hook = readFileSync(new URL("../src/lib/hooks/use-onboarding.ts", import.meta.url), "utf8");
assert.match(hook, /firstInvalidStep\(finalAnswers\)/, "completeOnboarding must validate before the RPC");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
assert.match(layout, /AuthHashErrorNotice/, "layout must surface auth hash errors");

// 8. Core roadmap seed guard migration exists and is idempotent.
const mig = readFileSync(new URL("../supabase/migrations/0090_ensure_core_roadmap_seed.sql", import.meta.url), "utf8");
assert.match(mig, /'zte-core-v1'/);
assert.match(mig, /on conflict \(id\) do update/i);
assert.match(mig, /not exists/i);

// 9. No UTC date slicing left anywhere in app code (breaks days for UTC+ timezones).
import { execSync } from "node:child_process";
const offenders = execSync(
  `grep -rln "toISOString().slice(0, 10)" src || true`,
  { cwd: new URL("..", import.meta.url), encoding: "utf8" }
).trim();
assert.equal(offenders, "", `UTC date slicing found in: ${offenders}`);

console.log("onboarding validation contracts: passed");
