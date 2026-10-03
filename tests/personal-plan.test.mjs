import assert from "node:assert/strict";
import { buildPersonalPlan } from "../src/lib/personal-plan.ts";

const base = {
  firstName: "Asha",
  roleName: "Backend Developer",
  goal: "first_job",
  experience: "beginner",
  weeklyHours: 10,
  targetDate: "2027-01-01",
  dsaLevel: "none",
  interviewReadiness: "none",
  careerSituation: "student",
  remainingHours: 200,
  completedTopics: 10,
  totalTopics: 100,
  nextTopicTitle: "HTTP basics",
  today: "2026-09-01",
};

// Personal: uses the user's own name, role, hours and next topic.
const p = buildPersonalPlan(base);
assert.match(p.headline, /Asha/);
assert.match(p.headline, /a Backend Developer/);
assert.match(p.subhead, /10h a week/);
assert.ok(p.nextActions.some((a) => a.includes("HTTP basics")));
assert.ok(p.nextActions.some((a) => /DSA/.test(a)), "beginner DSA gets a DSA action");
assert.ok(p.nextActions.some((a) => /GitHub/.test(a)), "students get a portfolio action");
assert.equal(p.percentDone, 10);

// Pacing: 122 days ≈ 18 weeks; 200h / 18 ≈ 11.1h needed vs 10 planned → tight.
assert.equal(p.weeksLeft, 18);
assert.equal(p.pace, "tight");
assert.equal(buildPersonalPlan({ ...base, weeklyHours: 20 }).pace, "on_track");
assert.equal(buildPersonalPlan({ ...base, weeklyHours: 5 }).pace, "behind");
assert.equal(buildPersonalPlan({ ...base, targetDate: "2026-08-01" }).pace, "behind");
assert.equal(buildPersonalPlan({ ...base, targetDate: null }).pace, "no_target");

// Checkpoints climb from current progress to 100% on the target date.
assert.equal(p.checkpoints.length, 4);
assert.equal(p.checkpoints.at(-1).date, "2027-01-01");
assert.equal(p.checkpoints.at(-1).targetPercent, 100);
assert.ok(p.checkpoints[0].targetPercent > 10 && p.checkpoints[0].targetPercent < 50);

// Works with almost no data and never mentions any owner-specific content.
const bare = buildPersonalPlan({ today: "2026-09-01" });
assert.equal(bare.headline, "Your plan to reach your goal");
const blob = JSON.stringify([p, bare]).toLowerCase();
for (const banned of ["clientsync", "applied materials", "rohan", "sap", "biz ops"]) {
  assert.ok(!blob.includes(banned), `personal plan leaked "${banned}"`);
}

// Curriculum seeds and the live-data migration must be project-neutral.
import { readFileSync } from "node:fs";
for (const f of ["seed_data.sql", "seed_data_part1.sql", "seed_data_snapshot_v1.sql", "seed_data_structural.sql", "seed_roadmap_tracks.sql"]) {
  const sql = readFileSync(new URL(`../supabase/${f}`, import.meta.url), "utf8");
  assert.ok(!/ClientSync|DevScribe|\bBCA\b/.test(sql), `${f} still names an owner project or degree`);
}
const mig = readFileSync(new URL("../supabase/migrations/0092_neutralize_curriculum_owner_references.sql", import.meta.url), "utf8");
assert.match(mig, /your flagship project/);
assert.match(mig, /jsonb/);
const tableList = mig.match(/catalog_tables text\[\] := array\[([\s\S]*?)\];/)[1];
assert.ok(!/note|journal|evidence|progress|log/i.test(tableList), "migration must only touch read-only catalog tables");

console.log("personal plan: passed");

// ---- weekly rhythm, resume checker and playbook content ----
import { weeklyRhythm } from "../src/lib/personal-plan.ts";
import { analyzeBullet } from "../src/lib/resume-bullets.ts";
import { INTERVIEW_PLAYBOOK } from "../src/content/shared/interview-playbook.ts";
import { RESUME_STUDIO } from "../src/content/shared/resume-studio.ts";
import { JOB_SEARCH_PLAYBOOK } from "../src/content/shared/job-search-playbook.ts";

for (const hours of [3, 7.5, 10, 20, 35]) {
  for (const goal of ["first_job", "interview_prep", "build_projects", "upskill"]) {
    const r = weeklyRhythm(hours, goal, "beginner");
    const total = r.reduce((s, b) => s + b.hours, 0);
    assert.equal(total, Math.round(hours * 2) / 2, `rhythm must sum to ${hours}h for ${goal}`);
    assert.ok(r.every((b) => b.hours >= 0));
  }
}
assert.deepEqual(weeklyRhythm(0), []);
const interview = weeklyRhythm(10, "interview_prep", "intermediate");
assert.ok(interview.find((b) => b.id === "practice").hours > weeklyRhythm(10, "build_projects", "intermediate").find((b) => b.id === "practice").hours);

const strong = analyzeBullet("Built a REST API with Node.js and PostgreSQL that cut report time from 3 minutes to 20 seconds");
assert.equal(strong.score, 100);
const weak = analyzeBullet("Responsible for the website");
assert.ok(weak.score < 50);
assert.ok(weak.checks.some((c) => c.id === "filler" && !c.passed));
assert.equal(analyzeBullet("").score, 0);

for (const book of [INTERVIEW_PLAYBOOK, RESUME_STUDIO, JOB_SEARCH_PLAYBOOK]) {
  const ids = book.sections.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, `${book.title}: duplicate section ids`);
  for (const s of book.sections) {
    assert.ok(s.blocks.length > 0, `${book.title}/${s.id} has no blocks`);
    const titles = s.blocks.map((b) => b.title);
    assert.equal(new Set(titles).size, titles.length, `${book.title}/${s.id}: duplicate block titles`);
    for (const b of s.blocks) {
      assert.ok(b.steps || b.items || b.table, `${book.title}/${b.title} is empty`);
      if (b.table) for (const row of b.table.rows) assert.equal(row.length, b.table.headers.length, `${b.title}: ragged table row`);
    }
  }
  const text = JSON.stringify(book).toLowerCase();
  for (const banned of ["clientsync", "devscribe", "applied materials", "rohan", "hampannavar", "bca", "silvassa"]) {
    assert.ok(!text.includes(banned), `${book.title} leaked "${banned}"`);
  }
}
console.log("playbooks + rhythm + resume checker: passed");

// ---- role paths ----
import { ROLE_PATHS, PROFILE_PATHS, ALL_PATHS, PHASE_TITLES, getRolePath, getRolePathForProfile, pathId } from "../src/content/shared/role-paths.ts";
import { readFileSync as readCatalog } from "node:fs";
const catalog = JSON.parse(readCatalog(new URL("../data/career-role-catalog.json", import.meta.url), "utf8"));
const catalogFamilies = catalog.families.map((f) => f.id);
assert.deepEqual([...ROLE_PATHS.map((p) => p.familyId)].sort(), [...catalogFamilies].sort(), "every career family needs exactly one role path");
for (const path of ROLE_PATHS) {
  assert.deepEqual(Object.keys(path.phaseMap).sort(), Object.keys(PHASE_TITLES).sort(), `${path.familyId}: phaseMap must cover every phase`);
  assert.ok(Object.values(path.phaseMap).includes("core"), `${path.familyId}: needs at least one core phase`);
  assert.ok(path.portfolio.length >= 2 && path.readyWhen.length >= 3 && path.mistakes.length >= 3 && path.dayInTheLife.length >= 3);
  for (const m of path.addOns) {
    assert.ok(m.weeks > 0 && m.topics.length >= 5 && m.project.length > 40, `${path.familyId}/${m.title}: thin module`);
  }
  for (const p of path.portfolio) assert.ok(p.acceptance.length >= 3, `${path.familyId}/${p.name}: needs acceptance criteria`);
  const text = JSON.stringify(path).toLowerCase();
  for (const banned of ["clientsync", "devscribe", "applied materials", "rohan", "hampannavar", "bca", "silvassa"]) {
    assert.ok(!text.includes(banned), `${path.familyId} leaked "${banned}"`);
  }
}
assert.equal(getRolePath("nope"), null);
console.log("role paths: passed");

// ---- lessons ----
import { DATA_AI_LESSONS } from "../src/content/shared/lessons/data-ai.ts";
import { CLOUD_LESSONS } from "../src/content/shared/lessons/cloud-infrastructure.ts";
import { QUALITY_LESSONS, SECURITY_LESSONS, MOBILE_LESSONS } from "../src/content/shared/lessons/quality-security-mobile.ts";
// index.ts uses extensionless imports (fine for the bundler, not for bare Node), so compose the same list here
// and verify the index actually includes every lesson set.
import { SOFTWARE_DEV_LESSONS, DATABASE_LESSONS } from "../src/content/shared/lessons/software-database.ts";
import { SYSTEMS_LESSONS, ENTERPRISE_LESSONS, SPECIALIZED_LESSONS } from "../src/content/shared/lessons/systems-enterprise-specialized.ts";
import { DATA_ANALYST_LESSONS } from "../src/content/shared/lessons/data-analyst.ts";
import { AI_ML_LESSONS_A } from "../src/content/shared/lessons/ai-ml-engineer-a.ts";
import { AI_ML_LESSONS_B } from "../src/content/shared/lessons/ai-ml-engineer-b.ts";
const ALL_LESSONS = [...DATA_AI_LESSONS, ...CLOUD_LESSONS, ...QUALITY_LESSONS, ...SECURITY_LESSONS, ...MOBILE_LESSONS, ...SOFTWARE_DEV_LESSONS, ...DATABASE_LESSONS, ...SYSTEMS_LESSONS, ...ENTERPRISE_LESSONS, ...SPECIALIZED_LESSONS, ...DATA_ANALYST_LESSONS, ...AI_ML_LESSONS_A, ...AI_ML_LESSONS_B];
const lessonIndexSource = readFileSync(new URL("../src/content/shared/lessons/index.ts", import.meta.url), "utf8");
for (const name of ["DATA_AI_LESSONS", "CLOUD_LESSONS", "QUALITY_LESSONS", "SECURITY_LESSONS", "MOBILE_LESSONS", "SOFTWARE_DEV_LESSONS", "DATABASE_LESSONS", "SYSTEMS_LESSONS", "ENTERPRISE_LESSONS", "SPECIALIZED_LESSONS", "DATA_ANALYST_LESSONS", "AI_ML_LESSONS_A", "AI_ML_LESSONS_B"]) {
  assert.match(lessonIndexSource, new RegExp(`\\.\\.\\.${name}`), `lessons/index.ts must include ${name}`);
}
const lessonsForFamily = (id) => ALL_LESSONS.filter((l) => l.familyId === id && !l.pathId);
const getLesson = (id) => ALL_LESSONS.find((l) => l.id === id);
const lessonIds = ALL_LESSONS.map((l) => l.id);
assert.equal(new Set(lessonIds).size, lessonIds.length, "duplicate lesson ids");
assert.ok(ALL_LESSONS.length >= 60, "expected at least 60 lessons");
for (const lesson of ALL_LESSONS) {
  const path = lesson.pathId ? PROFILE_PATHS.find((p) => pathId(p) === lesson.pathId) : ROLE_PATHS.find((p) => p.familyId === lesson.familyId);
  assert.ok(path, `${lesson.id}: unknown family or path`);
  if (lesson.pathId) assert.equal(path.familyId, lesson.familyId, `${lesson.id}: path belongs to a different family`);
  assert.ok(path.addOns.some((m) => m.title === lesson.module), `${lesson.id}: module "${lesson.module}" is not an add-on of ${lesson.familyId}`);
  assert.ok(lesson.minutes >= 20 && lesson.minutes <= 60, `${lesson.id}: unrealistic duration`);
  assert.ok(lesson.objectives.length >= 3 && lesson.keyIdeas.length >= 3 && lesson.pitfalls.length >= 3, `${lesson.id}: thin lists`);
  assert.ok(lesson.explain.length >= 3, `${lesson.id}: needs at least 3 explanation paragraphs`);
  const words = lesson.explain.join(" ").split(/\s+/).length;
  assert.ok(words >= 190, `${lesson.id}: explanation too short (${words} words)`);
  assert.ok(lesson.example.code && lesson.example.code.split("\n").length >= 5, `${lesson.id}: example needs real code`);
  assert.ok(lesson.example.walkthrough.length >= 3, `${lesson.id}: walkthrough too short`);
  assert.ok(lesson.practice.length >= 2 && lesson.practice.every((p) => p.task && p.hint), `${lesson.id}: practice tasks need hints`);
  assert.ok(lesson.quiz.length >= 3, `${lesson.id}: needs 3 quiz questions`);
  for (const q of lesson.quiz) {
    assert.ok(q.options.length >= 3 && q.options.length <= 5, `${lesson.id}: bad option count`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${lesson.id}: answer index out of range`);
    assert.equal(new Set(q.options).size, q.options.length, `${lesson.id}: duplicate options`);
    assert.ok(q.why.length > 30, `${lesson.id}: explanation for answer too short`);
  }
  const text = JSON.stringify(lesson).toLowerCase();
  for (const banned of ["clientsync", "devscribe", "applied materials", "rohan", "hampannavar", "bca", "silvassa"]) {
    assert.ok(!text.includes(banned), `${lesson.id} leaked "${banned}"`);
  }
}
// The correct answer should not always be in the same position.
const positions = new Set(ALL_LESSONS.flatMap((l) => l.quiz.map((q) => q.answer)));
assert.ok(positions.size >= 3, "quiz answers are too predictable");
assert.equal(getLesson("nope"), undefined);
assert.ok(lessonsForFamily("data-ai").length >= 7);
assert.ok(ALL_LESSONS.filter((l) => l.pathId === "data-analyst").length >= 9);
assert.ok(ALL_LESSONS.filter((l) => l.pathId === "ai-ml-engineer").length >= 11);
// Every add-on module with lessons is reachable; families without lessons are simply not listed.
for (const family of new Set(lessonIds.map((id) => ALL_LESSONS.find((l) => l.id === id).familyId))) assert.ok(getRolePath(family));

// ---- role-specific paths ----
const profileIdsInCatalog = new Set(catalog.roles.map((r) => r.profile_id));
const familyOfProfile = Object.fromEntries(catalog.roles.map((r) => [r.profile_id, r.family_id]));
const lessonIndexCheck = readFileSync(new URL("../src/content/shared/lessons/index.ts", import.meta.url), "utf8");
assert.match(lessonIndexCheck, /lessonsForPath/);
const seenProfile = new Set();
for (const path of PROFILE_PATHS) {
  assert.ok(path.id && path.profileIds?.length, `${path.title}: needs an id and profileIds`);
  assert.ok(getRolePath(path.familyId), `${path.id}: parent family has no family path`);
  for (const pid of path.profileIds) {
    assert.ok(profileIdsInCatalog.has(pid), `${path.id}: unknown profile ${pid}`);
    assert.equal(familyOfProfile[pid], path.familyId, `${path.id}: profile ${pid} is in another family`);
    assert.ok(!seenProfile.has(pid), `profile ${pid} is claimed by two role paths`);
    seenProfile.add(pid);
  }
  assert.deepEqual(Object.keys(path.phaseMap).sort(), Object.keys(PHASE_TITLES).sort(), `${path.id}: phaseMap must cover every phase`);
  assert.ok(Object.values(path.phaseMap).includes("core"));
  assert.ok(path.portfolio.length >= 3 && path.readyWhen.length >= 3 && path.mistakes.length >= 3 && path.dayInTheLife.length >= 3);
  const familyModules = getRolePath(path.familyId).addOns.map((m) => m.title);
  for (const inc of path.include ?? []) assert.ok(familyModules.includes(inc), `${path.id}: includes unknown family module "${inc}"`);
  // Role-specific paths must be fully covered: every module has at least one lesson, own or included.
  const own = ALL_LESSONS.filter((l) => l.pathId === path.id);
  const included = ALL_LESSONS.filter((l) => !l.pathId && l.familyId === path.familyId && (path.include ?? []).includes(l.module));
  for (const m of path.addOns) {
    const n = [...own, ...included].filter((l) => l.module === m.title).length;
    assert.ok(n >= 1, `${path.id}: module "${m.title}" has no lessons`);
    assert.ok(m.topics.length >= 5 && m.weeks > 0 && m.project.length > 40, `${path.id}/${m.title}: thin module`);
  }
  const text = JSON.stringify(path).toLowerCase();
  for (const banned of ["clientsync", "devscribe", "applied materials", "rohan", "hampannavar", "bca", "silvassa"]) assert.ok(!text.includes(banned), `${path.id} leaked "${banned}"`);
}
assert.equal(getRolePathForProfile("data-ai--data-analyst", "data-ai").id, "data-analyst");
assert.equal(getRolePathForProfile("data-ai--machine-learning-engineer", "data-ai").id, "ai-ml-engineer");
assert.equal(getRolePathForProfile("data-ai--llm-engineer", "data-ai").id, "ai-ml-engineer");
assert.equal(getRolePathForProfile("data-ai--data-scientist", "data-ai").familyId, "data-ai", "other profiles fall back to the family path");
assert.equal(getRolePathForProfile(null, "data-ai").familyId, "data-ai");
assert.equal(getRolePathForProfile("x", null), null);
assert.equal(ALL_PATHS.length, ROLE_PATHS.length + PROFILE_PATHS.length);
console.log("role-specific paths: passed");
console.log("lessons: passed");

// ---- lesson progress migration ----
const lessonMig = readFileSync(new URL("../supabase/migrations/0093_lesson_progress.sql", import.meta.url), "utf8");
assert.match(lessonMig, /enable row level security/i);
for (const op of ["select", "insert", "update", "delete"]) assert.match(lessonMig, new RegExp(`for ${op}`, "i"), `missing ${op} policy`);
assert.ok((lessonMig.match(/auth\.uid\(\)/g) ?? []).length >= 5, "every policy must scope to auth.uid()");
console.log("lesson progress migration: passed");

// ---- owner facts: tokens fill from runtime values, never from source ----
import { fillFacts, deepFill, setOwnerFacts, factsFromRows, GENERIC_FACTS } from "../src/lib/owner-facts.ts";
assert.equal(fillFacts("{{employer}} / {{handle}} / {{degree}}"), "your employer / your-handle / your degree", "shared users see generic wording");
setOwnerFacts(factsFromRows([
  { key: "employer", value: "Acme Corp" }, { key: "handle", value: "jane-dev" }, { key: "degree", value: "BSc" },
  { key: "role_long", value: "Operations associate" }, { key: "pay_lpa", value: "5" }, { key: "pay_monthly", value: "30k" }, { key: "age", value: "25" },
]));
assert.equal(fillFacts("{{employer}} {{pay}} {{pay_monthly}} {{age+2}}"), "Acme Corp ₹5L ₹30k/mo 27");
assert.deepEqual(deepFill({ a: ["{{role_long}}", { b: "{{degree}}" }], n: 3 }), { a: ["Operations associate", { b: "BSc" }], n: 3 });
setOwnerFacts(GENERIC_FACTS);
assert.equal(fillFacts("{{pay}}"), "your current pay");
console.log("owner facts: passed");
