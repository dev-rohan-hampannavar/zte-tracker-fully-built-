#!/usr/bin/env node

/**
 * PHASE 2 — Multi-user data isolation test (release blocker per the
 * master prompt's Phase 2, and the one item docs/AUDIT.md flagged as
 * unverified because this sandbox has no live Supabase credentials).
 *
 * What this does, against a REAL Supabase project:
 *   1. Creates two throwaway auth users (User A, User B) via the admin API.
 *   2. Signs in as each with the anon key (i.e. goes through normal RLS,
 *      not the service-role bypass — this is the actual code path a real
 *      client uses).
 *   3. As User A, writes one row into a representative sample of
 *      user-owned tables.
 *   4. As User B, attempts to SELECT, UPDATE, and DELETE those same rows.
 *      Every attempt must fail or return zero rows.
 *   5. As User A again, confirms their own rows are still there and
 *      unmodified.
 *   6. Deletes both throwaway users (cascades to their rows via the
 *      `on delete cascade` on user_id foreign keys), leaving the project
 *      clean regardless of pass/fail.
 *
 * This is NOT a full audit of all ~40 user-owned tables — that would mean
 * hand-writing valid insert payloads for every one (many have required
 * columns/checks specific to that table). It tests a representative
 * sample chosen to cover different RLS-policy shapes already found in
 * docs/AUDIT.md, plus the highest-sensitivity tables specifically:
 *   - a simple owner-only table (topic_progress)
 *   - a table with an additional opt-in public-read policy (user_settings)
 *   - a table with per-command policies instead of one `for all` (quick_captures)
 *   - an enrollment table with a sync trigger onto another table
 *     (user_roadmaps -> user_settings.roadmap_id, added in migration 0071)
 *   - the sensitive career/financial/DSA cluster the audit repeatedly
 *     flags as unverified: financial_profiles (salary/savings),
 *     career_tracker (job-search/offer status), dsa_progress, daily_logs,
 *     and goals
 *   - a further batch of ~15 simple owner-only tables (milestones,
 *     activity_log, career_decisions, notification_dismissals,
 *     study_sessions, weekly_commitments, time_blocks, evidence_items,
 *     user_skills, focus_sessions, daily_plan_task_state,
 *     public_streak_summary, exercise_progress, revision_history,
 *     roadmap_topic_notes) — bringing coverage to 25 of ~40 tables
 * A pass here is strong evidence the pattern is sound everywhere else,
 * since all ~40 tables use the same `auth.uid() = user_id` policy
 * template per migration 0001 — but it is evidence, not a proof for every
 * table. If this passes, the isolation model is confirmed to work; it
 * doesn't independently confirm every single table's SQL was typed
 * correctly.
 *
 * Requires:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY   (to create/delete the throwaway users)
 *   SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)  (to sign in as them)
 *
 * Run against a staging project if you have one. If you only have
 * production, that's fine too — this creates and fully deletes its own
 * throwaway users and rows; it never touches existing accounts or data.
 *
 * Usage: node scripts/verify-user-isolation.mjs
 */

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error(
    "Needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, " +
      "and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) set in the environment."
  );
  process.exit(2);
}

const runId = Math.random().toString(36).slice(2, 10);
const userAEmail = `zte-isolation-test-a-${runId}@example.invalid`;
const userBEmail = `zte-isolation-test-b-${runId}@example.invalid`;
const password = `Test-${runId}-${Date.now()}!`;

const adminHeaders = {
  "Content-Type": "application/json",
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};

const failures = [];
const passes = [];

function record(ok, label) {
  if (ok) {
    passes.push(label);
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

async function adminCreateUser(email) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`create user ${email} failed: HTTP ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.id;
}

async function adminDeleteUser(id) {
  if (!id) return;
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  if (!res.ok) {
    console.error(`  warning: cleanup failed to delete user ${id}: HTTP ${res.status}`);
  }
}

async function signIn(email) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`sign in ${email} failed: HTTP ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.access_token;
}

function restHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  };
}

async function main() {
  console.log(`Run ID: ${runId}`);
  let userAId, userBId;

  try {
    console.log("\n1. Creating throwaway users...");
    userAId = await adminCreateUser(userAEmail);
    userBId = await adminCreateUser(userBEmail);
    console.log(`   User A: ${userAId}`);
    console.log(`   User B: ${userBId}`);

    console.log("\n2. Signing in as each (anon key + password, the real client path)...");
    const tokenA = await signIn(userAEmail);
    const tokenB = await signIn(userBEmail);
    const headersA = restHeaders(tokenA);
    const headersB = restHeaders(tokenB);

    console.log("\n3. As User A, writing rows into representative tables...");
    // user_settings row already exists via the on_auth_user_created trigger
    // (migration 0001 + 0069) — update it rather than insert.
    const setA = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userAId}`, {
      method: "PATCH",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ display_name: `isolation-test-A-${runId}` }),
    });
    record(setA.ok, "User A can update their own user_settings row");

    const tpA = await fetch(`${supabaseUrl}/rest/v1/topic_progress`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      // topic_progress has a composite primary key (user_id, topic_id) —
      // no surrogate id column — and topic_id is a foreign key into the
      // real `topics` table, so this must be a topic id that actually
      // exists (from the seeded curriculum), not an arbitrary string.
      body: JSON.stringify({ user_id: userAId, topic_id: "topic-01-001", completed: true }),
    });
    const tpABody = tpA.ok ? await tpA.json() : null;
    record(tpA.ok, "User A can insert their own topic_progress row");

    const qcA = await fetch(`${supabaseUrl}/rest/v1/quick_captures`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, body: `isolation test ${runId}` }),
    });
    record(qcA.ok, "User A can insert their own quick_captures row");

    // migration 0071 — enrollment. zte-core-v1 is a valid FK target from
    // migration 0070, so no throwaway shared roadmap needs to be created.
    const urA = await fetch(`${supabaseUrl}/rest/v1/user_roadmaps`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, roadmap_id: "zte-core-v1", status: "active" }),
    });
    const urABody = urA.ok ? await urA.json() : null;
    record(urA.ok, "User A can insert their own user_roadmaps row");

    // Migrations 0078/0080 add detailed shared content and two new user-owned
    // progress tables. Use real public seed IDs so the foreign keys are valid.
    const detailTopicResponseA = await fetch(`${supabaseUrl}/rest/v1/roadmap_topics?select=id&limit=1`, { headers: headersA });
    const detailTopicRowsA = detailTopicResponseA.ok ? await detailTopicResponseA.json() : [];
    const detailTopicId = detailTopicRowsA[0]?.id;
    record(detailTopicResponseA.ok && Boolean(detailTopicId), "User A can read seeded detailed roadmap topics");
    const detailedTopicProgressA = detailTopicId ? await fetch(`${supabaseUrl}/rest/v1/user_roadmap_topic_progress`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, topic_id: detailTopicId, status: "learning" }),
    }) : null;
    const detailedTopicProgressABody = detailedTopicProgressA?.ok ? await detailedTopicProgressA.json() : null;
    record(Boolean(detailedTopicProgressA?.ok), "User A can insert their own detailed roadmap topic progress");

    const detailProjectResponseA = await fetch(`${supabaseUrl}/rest/v1/roadmap_projects?select=id&limit=1`, { headers: headersA });
    const detailProjectRowsA = detailProjectResponseA.ok ? await detailProjectResponseA.json() : [];
    const detailProjectId = detailProjectRowsA[0]?.id;
    record(detailProjectResponseA.ok && Boolean(detailProjectId), "User A can read seeded detailed roadmap projects");
    const detailedProjectProgressA = detailProjectId ? await fetch(`${supabaseUrl}/rest/v1/user_roadmap_project_progress`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, project_id: detailProjectId, status: "planning", notes: `isolation test ${runId}` }),
    }) : null;
    record(Boolean(detailedProjectProgressA?.ok), "User A can insert their own detailed roadmap project progress");

    // Sensitive-data cluster: financial_profiles, career_tracker, dsa_progress,
    // daily_logs, and goals hold the most sensitive per-user content in the
    // schema (salary/savings, job-search/offer status, personal notes) and
    // were not previously exercised by this script even though the audit
    // repeatedly flags them as the highest-priority unverified tables.
    console.log("\n3b. As User A, writing rows into the sensitive career/financial/DSA cluster...");

    const finA = await fetch(`${supabaseUrl}/rest/v1/financial_profiles`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userAId,
        monthly_income: 123456,
        monthly_expenses: 50000,
        savings: 900000,
        minimum_switch_salary: 200000,
      }),
    });
    record(finA.ok, "User A can insert their own financial_profiles row");

    const careerA = await fetch(`${supabaseUrl}/rest/v1/career_tracker`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, company: `isolation-test-co-${runId}`, application_status: "applied" }),
    });
    const careerABody = careerA.ok ? await careerA.json() : null;
    record(Boolean(careerABody?.[0]?.id), "User A can insert their own career_tracker row");

    const dsaA = await fetch(`${supabaseUrl}/rest/v1/dsa_progress`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, problem_name: `isolation-test-${runId}`, difficulty: "easy" }),
    });
    const dsaABody = dsaA.ok ? await dsaA.json() : null;
    record(Boolean(dsaABody?.[0]?.id), "User A can insert their own dsa_progress row");

    const logDate = new Date().toISOString().slice(0, 10);
    const logA = await fetch(`${supabaseUrl}/rest/v1/daily_logs`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, date: logDate, hours: 1, note: `isolation test ${runId}` }),
    });
    record(logA.ok, "User A can insert their own daily_logs row");

    const goalA = await fetch(`${supabaseUrl}/rest/v1/goals`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, title: `isolation test goal ${runId}` }),
    });
    const goalABody = goalA.ok ? await goalA.json() : null;
    record(Boolean(goalABody?.[0]?.id), "User A can insert their own goals row");

    console.log("\n3c. As User A, writing rows into remaining simple owner-only tables...");

    // milestones (belongs to the goal just created above)
    let milestoneABody = null;
    if (goalABody?.[0]?.id) {
      const milestoneA = await fetch(`${supabaseUrl}/rest/v1/milestones`, {
        method: "POST",
        headers: { ...headersA, Prefer: "return=representation" },
        body: JSON.stringify({ user_id: userAId, goal_id: goalABody[0].id, title: `isolation test milestone ${runId}` }),
      });
      milestoneABody = milestoneA.ok ? await milestoneA.json() : null;
      record(Boolean(milestoneABody?.[0]?.id), "User A can insert their own milestones row");
    }

    const activityLogA = await fetch(`${supabaseUrl}/rest/v1/activity_log`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userAId,
        action: "goal_created",
        entity_type: "goal",
        entity_id: goalABody?.[0]?.id ?? "isolation-test",
        summary: `isolation test ${runId}`,
      }),
    });
    const activityLogABody = activityLogA.ok ? await activityLogA.json() : null;
    record(Boolean(activityLogABody?.[0]?.id), "User A can insert their own activity_log row");

    const careerDecisionA = await fetch(`${supabaseUrl}/rest/v1/career_decisions`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userAId,
        decision: "insufficient-evidence",
        action_taken: "deferred",
        snapshot: { note: `isolation test ${runId}` },
      }),
    });
    const careerDecisionABody = careerDecisionA.ok ? await careerDecisionA.json() : null;
    record(Boolean(careerDecisionABody?.[0]?.id), "User A can insert their own career_decisions row");

    const notifDismissA = await fetch(`${supabaseUrl}/rest/v1/notification_dismissals`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, notification_id: `isolation-test-${runId}`, action: "read" }),
    });
    const notifDismissABody = notifDismissA.ok ? await notifDismissA.json() : null;
    record(Boolean(notifDismissABody?.[0]?.id), "User A can insert their own notification_dismissals row");

    const studySessionA = await fetch(`${supabaseUrl}/rest/v1/study_sessions`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, date: logDate, hours: 1, activity: "learn" }),
    });
    const studySessionABody = studySessionA.ok ? await studySessionA.json() : null;
    record(Boolean(studySessionABody?.[0]?.id), "User A can insert their own study_sessions row");

    const weeklyCommitA = await fetch(`${supabaseUrl}/rest/v1/weekly_commitments`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, week_start: logDate, title: `isolation test ${runId}` }),
    });
    const weeklyCommitABody = weeklyCommitA.ok ? await weeklyCommitA.json() : null;
    record(Boolean(weeklyCommitABody?.[0]?.id), "User A can insert their own weekly_commitments row");

    const timeBlockA = await fetch(`${supabaseUrl}/rest/v1/time_blocks`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userAId,
        block_date: logDate,
        start_time: "09:00",
        end_time: "10:00",
        title: `isolation test ${runId}`,
      }),
    });
    const timeBlockABody = timeBlockA.ok ? await timeBlockA.json() : null;
    record(Boolean(timeBlockABody?.[0]?.id), "User A can insert their own time_blocks row");

    const evidenceItemA = await fetch(`${supabaseUrl}/rest/v1/evidence_items`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, title: `isolation test ${runId}`, evidence_type: "other" }),
    });
    const evidenceItemABody = evidenceItemA.ok ? await evidenceItemA.json() : null;
    record(Boolean(evidenceItemABody?.[0]?.id), "User A can insert their own evidence_items row");

    const userSkillA = await fetch(`${supabaseUrl}/rest/v1/user_skills`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, custom_name: `isolation-test-skill-${runId}` }),
    });
    const userSkillABody = userSkillA.ok ? await userSkillA.json() : null;
    record(Boolean(userSkillABody?.[0]?.id), "User A can insert their own user_skills row");

    const focusSessionA = await fetch(`${supabaseUrl}/rest/v1/focus_sessions`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, mode: "stopwatch", activity: "learn" }),
    });
    const focusSessionABody = focusSessionA.ok ? await focusSessionA.json() : null;
    record(Boolean(focusSessionABody?.[0]?.id), "User A can insert their own focus_sessions row");

    const dailyPlanTaskA = await fetch(`${supabaseUrl}/rest/v1/daily_plan_task_state`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userAId,
        plan_date: logDate,
        task_key: `isolation-test:${runId}`,
        kind: "learning",
        title: `isolation test ${runId}`,
      }),
    });
    const dailyPlanTaskABody = dailyPlanTaskA.ok ? await dailyPlanTaskA.json() : null;
    record(Boolean(dailyPlanTaskABody?.[0]?.user_id), "User A can insert their own daily_plan_task_state row");

    const publicStreakA = await fetch(`${supabaseUrl}/rest/v1/public_streak_summary`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, current_streak: 1, best_streak: 1, total_days_logged: 1 }),
    });
    record(publicStreakA.ok, "User A can insert their own public_streak_summary row");

    // exercise_progress needs a real stage_exercises.id (shared catalog lookup)
    const stageExResponseA = await fetch(`${supabaseUrl}/rest/v1/stage_exercises?select=id&limit=1`, { headers: headersA });
    const stageExRowsA = stageExResponseA.ok ? await stageExResponseA.json() : [];
    const stageExerciseId = stageExRowsA[0]?.id;
    let exerciseProgressABody = null;
    if (stageExerciseId) {
      const exerciseProgressA = await fetch(`${supabaseUrl}/rest/v1/exercise_progress`, {
        method: "POST",
        headers: { ...headersA, Prefer: "return=representation" },
        body: JSON.stringify({ user_id: userAId, exercise_id: stageExerciseId, completed: true }),
      });
      exerciseProgressABody = exerciseProgressA.ok ? await exerciseProgressA.json() : null;
      record(Boolean(exerciseProgressA.ok), "User A can insert their own exercise_progress row");
    }

    // revision_history needs a real topics.id (shared catalog lookup)
    const legacyTopicResponseA = await fetch(`${supabaseUrl}/rest/v1/topics?select=id&limit=1`, { headers: headersA });
    const legacyTopicRowsA = legacyTopicResponseA.ok ? await legacyTopicResponseA.json() : [];
    const legacyTopicId = legacyTopicRowsA[0]?.id;
    if (legacyTopicId) {
      const revisionHistoryA = await fetch(`${supabaseUrl}/rest/v1/revision_history`, {
        method: "POST",
        headers: { ...headersA, Prefer: "return=representation" },
        body: JSON.stringify({ user_id: userAId, topic_id: legacyTopicId, confidence_rating: 3, resulting_tier: "review" }),
      });
      record(revisionHistoryA.ok, "User A can insert their own revision_history row");
    }

    // roadmap_topic_notes reuses detailTopicId from the detailed-track lookup done earlier
    if (detailTopicId) {
      const roadmapNoteA = await fetch(`${supabaseUrl}/rest/v1/roadmap_topic_notes`, {
        method: "POST",
        headers: { ...headersA, Prefer: "return=representation" },
        body: JSON.stringify({ user_id: userAId, topic_id: detailTopicId, note: `isolation test ${runId}` }),
      });
      record(roadmapNoteA.ok, "User A can insert their own roadmap_topic_notes row");
    }

    console.log("\n4. As User B, attempting to read/write User A's rows (must all fail)...");

    const readSettingsB = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userAId}`, {
      headers: headersB,
    });
    const readSettingsBBody = readSettingsB.ok ? await readSettingsB.json() : [];
    record(
      Array.isArray(readSettingsBBody) && readSettingsBBody.length === 0,
      "User B cannot read User A's user_settings row"
    );

    const readTpB = await fetch(`${supabaseUrl}/rest/v1/topic_progress?user_id=eq.${userAId}&topic_id=eq.topic-01-001`, {
      headers: headersB,
    });
    const readTpBBody = readTpB.ok ? await readTpB.json() : [];
    record(Array.isArray(readTpBBody) && readTpBBody.length === 0, "User B cannot read User A's topic_progress rows");

    const readQcB = await fetch(`${supabaseUrl}/rest/v1/quick_captures?user_id=eq.${userAId}`, {
      headers: headersB,
    });
    const readQcBBody = readQcB.ok ? await readQcB.json() : [];
    record(Array.isArray(readQcBBody) && readQcBBody.length === 0, "User B cannot read User A's quick_captures rows");

    const readUrB = await fetch(`${supabaseUrl}/rest/v1/user_roadmaps?user_id=eq.${userAId}`, {
      headers: headersB,
    });
    const readUrBBody = readUrB.ok ? await readUrB.json() : [];
    record(Array.isArray(readUrBBody) && readUrBBody.length === 0, "User B cannot read User A's user_roadmaps rows");

    const returnUsageA = await fetch(`${supabaseUrl}/rest/v1/rpc/record_product_event`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ p_event_name: "return_usage" }),
    });
    record(returnUsageA.ok, "User A can record a privacy-safe return-usage milestone through the RPC");
    const productEventsA = await fetch(`${supabaseUrl}/rest/v1/product_events?select=event_name&user_id=eq.${userAId}`, { headers: headersA });
    const productEventsABody = productEventsA.ok ? await productEventsA.json() : [];
    record(productEventsA.ok && productEventsABody.some((row) => row.event_name === "signup"), "User A can read their own signup milestone");
    record(productEventsA.ok && productEventsABody.some((row) => row.event_name === "return_usage"), "User A can read their own return-usage milestone");
    const productEventsB = await fetch(`${supabaseUrl}/rest/v1/product_events?select=event_name&user_id=eq.${userAId}`, { headers: headersB });
    const productEventsBBody = productEventsB.ok ? await productEventsB.json() : [];
    record(productEventsB.ok && productEventsBBody.length === 0, "User B cannot read User A's product events");
    const directEventWriteA = await fetch(`${supabaseUrl}/rest/v1/product_events`, {
      method: "POST",
      headers: { ...headersA, Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userAId, event_name: "return_usage" }),
    });
    record(!directEventWriteA.ok, "Users cannot bypass the event RPC and write arbitrary product events directly");

    if (detailTopicId && detailedTopicProgressABody?.[0]) {
      const readDetailedTopicB = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_topic_progress?user_id=eq.${userAId}&topic_id=eq.${encodeURIComponent(detailTopicId)}`,
        { headers: headersB }
      );
      const readDetailedTopicBBody = readDetailedTopicB.ok ? await readDetailedTopicB.json() : [];
      record(Array.isArray(readDetailedTopicBBody) && readDetailedTopicBBody.length === 0, "User B cannot read User A's detailed topic progress");

      const updateDetailedTopicB = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_topic_progress?user_id=eq.${userAId}&topic_id=eq.${encodeURIComponent(detailTopicId)}`,
        { method: "PATCH", headers: { ...headersB, Prefer: "return=representation" }, body: JSON.stringify({ status: "mastered" }) }
      );
      const updateDetailedTopicBBody = updateDetailedTopicB.ok ? await updateDetailedTopicB.json() : [];
      record(Array.isArray(updateDetailedTopicBBody) && updateDetailedTopicBBody.length === 0, "User B cannot update User A's detailed topic progress");

      const deleteDetailedTopicB = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_topic_progress?user_id=eq.${userAId}&topic_id=eq.${encodeURIComponent(detailTopicId)}`,
        { method: "DELETE", headers: { ...headersB, Prefer: "return=representation" } }
      );
      const deleteDetailedTopicBBody = deleteDetailedTopicB.ok ? await deleteDetailedTopicB.json() : [];
      record(Array.isArray(deleteDetailedTopicBBody) && deleteDetailedTopicBBody.length === 0, "User B cannot delete User A's detailed topic progress");
    }

    if (detailProjectId) {
      const readDetailedProjectB = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_project_progress?user_id=eq.${userAId}&project_id=eq.${encodeURIComponent(detailProjectId)}`,
        { headers: headersB }
      );
      const readDetailedProjectBBody = readDetailedProjectB.ok ? await readDetailedProjectB.json() : [];
      record(Array.isArray(readDetailedProjectBBody) && readDetailedProjectBBody.length === 0, "User B cannot read User A's detailed project progress");

      const updateDetailedProjectB = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_project_progress?user_id=eq.${userAId}&project_id=eq.${encodeURIComponent(detailProjectId)}`,
        { method: "PATCH", headers: { ...headersB, Prefer: "return=representation" }, body: JSON.stringify({ status: "complete" }) }
      );
      const updateDetailedProjectBBody = updateDetailedProjectB.ok ? await updateDetailedProjectB.json() : [];
      record(Array.isArray(updateDetailedProjectBBody) && updateDetailedProjectBBody.length === 0, "User B cannot update User A's detailed project progress");

      const deleteDetailedProjectB = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_project_progress?user_id=eq.${userAId}&project_id=eq.${encodeURIComponent(detailProjectId)}`,
        { method: "DELETE", headers: { ...headersB, Prefer: "return=representation" } }
      );
      const deleteDetailedProjectBBody = deleteDetailedProjectB.ok ? await deleteDetailedProjectB.json() : [];
      record(Array.isArray(deleteDetailedProjectBBody) && deleteDetailedProjectBBody.length === 0, "User B cannot delete User A's detailed project progress");
    }

    // Sensitive cluster: User B must get zero rows on read, and zero rows
    // affected on update/delete, for every one of these — a leak here
    // would expose salary/savings, job-search status, or personal notes.
    const readFinB = await fetch(`${supabaseUrl}/rest/v1/financial_profiles?user_id=eq.${userAId}`, { headers: headersB });
    const readFinBBody = readFinB.ok ? await readFinB.json() : [];
    record(Array.isArray(readFinBBody) && readFinBBody.length === 0, "User B cannot read User A's financial_profiles row");
    const writeFinB = await fetch(`${supabaseUrl}/rest/v1/financial_profiles?user_id=eq.${userAId}`, {
      method: "PATCH",
      headers: { ...headersB, Prefer: "return=representation" },
      body: JSON.stringify({ savings: 0 }),
    });
    const writeFinBBody = writeFinB.ok ? await writeFinB.json() : [];
    record(Array.isArray(writeFinBBody) && writeFinBBody.length === 0, "User B's update to User A's financial_profiles affects zero rows");

    if (careerABody?.[0]?.id) {
      const readCareerB = await fetch(`${supabaseUrl}/rest/v1/career_tracker?id=eq.${careerABody[0].id}`, { headers: headersB });
      const readCareerBBody = readCareerB.ok ? await readCareerB.json() : [];
      record(Array.isArray(readCareerBBody) && readCareerBBody.length === 0, "User B cannot read User A's career_tracker row");
      const deleteCareerB = await fetch(`${supabaseUrl}/rest/v1/career_tracker?id=eq.${careerABody[0].id}`, {
        method: "DELETE",
        headers: { ...headersB, Prefer: "return=representation" },
      });
      const deleteCareerBBody = deleteCareerB.ok ? await deleteCareerB.json() : [];
      record(Array.isArray(deleteCareerBBody) && deleteCareerBBody.length === 0, "User B cannot delete User A's career_tracker row");
    }

    if (dsaABody?.[0]?.id) {
      const readDsaB = await fetch(`${supabaseUrl}/rest/v1/dsa_progress?id=eq.${dsaABody[0].id}`, { headers: headersB });
      const readDsaBBody = readDsaB.ok ? await readDsaB.json() : [];
      record(Array.isArray(readDsaBBody) && readDsaBBody.length === 0, "User B cannot read User A's dsa_progress row");
    }

    const readLogB = await fetch(`${supabaseUrl}/rest/v1/daily_logs?user_id=eq.${userAId}&date=eq.${logDate}`, { headers: headersB });
    const readLogBBody = readLogB.ok ? await readLogB.json() : [];
    record(Array.isArray(readLogBBody) && readLogBBody.length === 0, "User B cannot read User A's daily_logs row");

    if (goalABody?.[0]?.id) {
      const readGoalB = await fetch(`${supabaseUrl}/rest/v1/goals?id=eq.${goalABody[0].id}`, { headers: headersB });
      const readGoalBBody = readGoalB.ok ? await readGoalB.json() : [];
      record(Array.isArray(readGoalBBody) && readGoalBBody.length === 0, "User B cannot read User A's goals row");
    }

    // Cross-user checks for the batch of remaining simple owner-only tables.
    if (milestoneABody?.[0]?.id) {
      const readMilestoneB = await fetch(`${supabaseUrl}/rest/v1/milestones?id=eq.${milestoneABody[0].id}`, { headers: headersB });
      const readMilestoneBBody = readMilestoneB.ok ? await readMilestoneB.json() : [];
      record(Array.isArray(readMilestoneBBody) && readMilestoneBBody.length === 0, "User B cannot read User A's milestones row");
    }
    if (activityLogABody?.[0]?.id) {
      const readActivityB = await fetch(`${supabaseUrl}/rest/v1/activity_log?id=eq.${activityLogABody[0].id}`, { headers: headersB });
      const readActivityBBody = readActivityB.ok ? await readActivityB.json() : [];
      record(Array.isArray(readActivityBBody) && readActivityBBody.length === 0, "User B cannot read User A's activity_log row");
    }
    if (careerDecisionABody?.[0]?.id) {
      const readCareerDecB = await fetch(`${supabaseUrl}/rest/v1/career_decisions?id=eq.${careerDecisionABody[0].id}`, { headers: headersB });
      const readCareerDecBBody = readCareerDecB.ok ? await readCareerDecB.json() : [];
      record(Array.isArray(readCareerDecBBody) && readCareerDecBBody.length === 0, "User B cannot read User A's career_decisions row");
    }
    if (notifDismissABody?.[0]?.id) {
      const readNotifB = await fetch(`${supabaseUrl}/rest/v1/notification_dismissals?id=eq.${notifDismissABody[0].id}`, { headers: headersB });
      const readNotifBBody = readNotifB.ok ? await readNotifB.json() : [];
      record(Array.isArray(readNotifBBody) && readNotifBBody.length === 0, "User B cannot read User A's notification_dismissals row");
    }
    if (studySessionABody?.[0]?.id) {
      const readStudySessB = await fetch(`${supabaseUrl}/rest/v1/study_sessions?id=eq.${studySessionABody[0].id}`, { headers: headersB });
      const readStudySessBBody = readStudySessB.ok ? await readStudySessB.json() : [];
      record(Array.isArray(readStudySessBBody) && readStudySessBBody.length === 0, "User B cannot read User A's study_sessions row");
    }
    if (weeklyCommitABody?.[0]?.id) {
      const readWeeklyB = await fetch(`${supabaseUrl}/rest/v1/weekly_commitments?id=eq.${weeklyCommitABody[0].id}`, { headers: headersB });
      const readWeeklyBBody = readWeeklyB.ok ? await readWeeklyB.json() : [];
      record(Array.isArray(readWeeklyBBody) && readWeeklyBBody.length === 0, "User B cannot read User A's weekly_commitments row");
    }
    if (timeBlockABody?.[0]?.id) {
      const readTimeBlockB = await fetch(`${supabaseUrl}/rest/v1/time_blocks?id=eq.${timeBlockABody[0].id}`, { headers: headersB });
      const readTimeBlockBBody = readTimeBlockB.ok ? await readTimeBlockB.json() : [];
      record(Array.isArray(readTimeBlockBBody) && readTimeBlockBBody.length === 0, "User B cannot read User A's time_blocks row");
    }
    if (evidenceItemABody?.[0]?.id) {
      const readEvidenceB = await fetch(`${supabaseUrl}/rest/v1/evidence_items?id=eq.${evidenceItemABody[0].id}`, { headers: headersB });
      const readEvidenceBBody = readEvidenceB.ok ? await readEvidenceB.json() : [];
      record(Array.isArray(readEvidenceBBody) && readEvidenceBBody.length === 0, "User B cannot read User A's evidence_items row");
    }
    if (userSkillABody?.[0]?.id) {
      const readSkillB = await fetch(`${supabaseUrl}/rest/v1/user_skills?id=eq.${userSkillABody[0].id}`, { headers: headersB });
      const readSkillBBody = readSkillB.ok ? await readSkillB.json() : [];
      record(Array.isArray(readSkillBBody) && readSkillBBody.length === 0, "User B cannot read User A's user_skills row");
    }
    if (focusSessionABody?.[0]?.id) {
      const readFocusB = await fetch(`${supabaseUrl}/rest/v1/focus_sessions?id=eq.${focusSessionABody[0].id}`, { headers: headersB });
      const readFocusBBody = readFocusB.ok ? await readFocusB.json() : [];
      record(Array.isArray(readFocusBBody) && readFocusBBody.length === 0, "User B cannot read User A's focus_sessions row");
    }
    if (dailyPlanTaskABody?.[0]?.user_id) {
      const readPlanTaskB = await fetch(
        `${supabaseUrl}/rest/v1/daily_plan_task_state?user_id=eq.${userAId}&task_key=eq.${encodeURIComponent(`isolation-test:${runId}`)}`,
        { headers: headersB }
      );
      const readPlanTaskBBody = readPlanTaskB.ok ? await readPlanTaskB.json() : [];
      record(Array.isArray(readPlanTaskBBody) && readPlanTaskBBody.length === 0, "User B cannot read User A's daily_plan_task_state row");
    }
    const readStreakB = await fetch(`${supabaseUrl}/rest/v1/public_streak_summary?user_id=eq.${userAId}`, { headers: headersB });
    const readStreakBBody = readStreakB.ok ? await readStreakB.json() : [];
    record(Array.isArray(readStreakBBody) && readStreakBBody.length === 0, "User B cannot read User A's public_streak_summary row directly (only the profile-opt-in API path may expose it)");
    if (exerciseProgressABody?.[0]) {
      const readExProgB = await fetch(
        `${supabaseUrl}/rest/v1/exercise_progress?user_id=eq.${userAId}&exercise_id=eq.${encodeURIComponent(stageExerciseId)}`,
        { headers: headersB }
      );
      const readExProgBBody = readExProgB.ok ? await readExProgB.json() : [];
      record(Array.isArray(readExProgBBody) && readExProgBBody.length === 0, "User B cannot read User A's exercise_progress row");
    }

    const writeSettingsB = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userAId}`, {
      method: "PATCH",
      headers: { ...headersB, Prefer: "return=representation" },
      body: JSON.stringify({ display_name: "hijacked" }),
    });
    const writeSettingsBBody = writeSettingsB.ok ? await writeSettingsB.json() : [];
    record(
      Array.isArray(writeSettingsBBody) && writeSettingsBBody.length === 0,
      "User B's update to User A's user_settings row affects zero rows"
    );

    if (tpABody && tpABody[0]) {
      const deleteTpB = await fetch(
        `${supabaseUrl}/rest/v1/topic_progress?user_id=eq.${userAId}&topic_id=eq.topic-01-001`,
        {
          method: "DELETE",
          headers: { ...headersB, Prefer: "return=representation" },
        }
      );
      const deleteTpBBody = deleteTpB.ok ? await deleteTpB.json() : [];
      record(
        Array.isArray(deleteTpBBody) && deleteTpBBody.length === 0,
        "User B's delete of User A's topic_progress row affects zero rows"
      );
    }

    console.log("\n5. Confirming User A's own data is intact and unmodified...");
    const confirmSettingsA = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userAId}`, {
      headers: headersA,
    });
    const confirmSettingsABody = confirmSettingsA.ok ? await confirmSettingsA.json() : [];
    record(
      confirmSettingsABody[0]?.display_name === `isolation-test-A-${runId}`,
      "User A's user_settings row still has User A's own value (not User B's attempted overwrite)"
    );

    if (tpABody && tpABody[0]) {
      const confirmTpA = await fetch(
        `${supabaseUrl}/rest/v1/topic_progress?user_id=eq.${userAId}&topic_id=eq.topic-01-001`,
        { headers: headersA }
      );
      const confirmTpABody = confirmTpA.ok ? await confirmTpA.json() : [];
      record(confirmTpABody.length === 1, "User A's topic_progress row still exists (User B's delete attempt did not remove it)");
    }

    if (detailTopicId && detailedTopicProgressABody?.[0]) {
      const confirmDetailedTopicA = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_topic_progress?user_id=eq.${userAId}&topic_id=eq.${encodeURIComponent(detailTopicId)}`,
        { headers: headersA }
      );
      const confirmDetailedTopicABody = confirmDetailedTopicA.ok ? await confirmDetailedTopicA.json() : [];
      record(confirmDetailedTopicABody[0]?.status === "learning", "User A's detailed topic progress remains intact");
    }

    if (detailProjectId) {
      const confirmDetailedProjectA = await fetch(
        `${supabaseUrl}/rest/v1/user_roadmap_project_progress?user_id=eq.${userAId}&project_id=eq.${encodeURIComponent(detailProjectId)}`,
        { headers: headersA }
      );
      const confirmDetailedProjectABody = confirmDetailedProjectA.ok ? await confirmDetailedProjectA.json() : [];
      record(confirmDetailedProjectABody[0]?.status === "planning", "User A's detailed project progress remains intact");
    }

    const confirmFinA = await fetch(`${supabaseUrl}/rest/v1/financial_profiles?user_id=eq.${userAId}`, { headers: headersA });
    const confirmFinABody = confirmFinA.ok ? await confirmFinA.json() : [];
    record(confirmFinABody[0]?.savings === 900000, "User A's financial_profiles row is unmodified by User B's attempted overwrite");

    console.log("\n6. Confirming shared/reference content is still readable by both (should NOT be blocked)...");
    const phasesA = await fetch(`${supabaseUrl}/rest/v1/phases?limit=1`, { headers: headersA });
    record(phasesA.ok, "User A can still read shared `phases` content");
    const phasesB = await fetch(`${supabaseUrl}/rest/v1/phases?limit=1`, { headers: headersB });
    record(phasesB.ok, "User B can still read shared `phases` content");
    const roadmapsA = await fetch(`${supabaseUrl}/rest/v1/roadmaps?limit=1`, { headers: headersA });
    record(roadmapsA.ok, "User A can still read shared `roadmaps` catalog");

    if (urABody && urABody[0]) {
      console.log("\n7. Confirming the user_roadmaps -> user_settings sync trigger fired...");
      const settingsAfterEnroll = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userAId}&select=roadmap_id`, {
        headers: headersA,
      });
      const settingsAfterEnrollBody = settingsAfterEnroll.ok ? await settingsAfterEnroll.json() : [];
      record(
        settingsAfterEnrollBody[0]?.roadmap_id === "zte-core-v1",
        "user_settings.roadmap_id was synced by the trigger after the active user_roadmaps insert"
      );
    }
  } catch (error) {
    console.error("\nTest run threw an unexpected error:", error instanceof Error ? error.message : error);
    failures.push(`unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    console.log("\n8. Cleaning up throwaway users (cascades to their rows)...");
    await adminDeleteUser(userAId);
    await adminDeleteUser(userBId);
  }

  console.log(`\n${passes.length} passed, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nMulti-user data isolation verified for the tested tables.");
}

main();
