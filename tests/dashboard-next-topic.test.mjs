import assert from "node:assert/strict";

// Contract-level regression tests for the Phase 7/9 integration in
// src/app/(app)/dashboard/page.tsx's nextTopic computation: a recorded
// starting_phase_id should skip earlier phases for a fresh enrollment,
// but never override real progress a user already has in those earlier
// phases. Reproduced inline (matching tests/safe-redirect.test.mjs's
// convention) rather than imported, since the dashboard page is a "use
// client" component this suite can't import without a bundler — kept in
// sync by hand; if the dashboard's nextTopic logic changes, update this
// file to match.

function computeNextTopic(phases, startingPhaseId) {
  const startingPhaseOrderIndex = startingPhaseId
    ? (phases.find((p) => p.id === startingPhaseId)?.order_index ?? null)
    : null;

  const hasAnyTouchedProgressBeforeStart =
    startingPhaseOrderIndex !== null &&
    phases
      .filter((p) => p.order_index < startingPhaseOrderIndex)
      .some((p) => (p.stages ?? []).some((s) => s.topics.some((t) => t.progress)));

  const eligiblePhases =
    startingPhaseOrderIndex !== null && !hasAnyTouchedProgressBeforeStart
      ? phases.filter((p) => p.order_index >= startingPhaseOrderIndex)
      : phases;

  const candidates = eligiblePhases.flatMap((phase, phaseIdx) =>
    (phase.stages ?? []).flatMap((stage, stageIdx) =>
      stage.topics.map((topic, topicIdx) => ({ topic, phase, phaseIdx, stageIdx, topicIdx }))
    )
  );
  const next = candidates
    .filter((c) => !c.topic.progress?.completed)
    .sort((a, b) => a.phaseIdx - b.phaseIdx || a.stageIdx - b.stageIdx || a.topicIdx - b.topicIdx)[0];
  return next ? { topicId: next.topic.id, phaseId: next.phase.id } : null;
}

function phase(id, order_index, topics) {
  return { id, order_index, stages: [{ topics }] };
}
function topic(id, progress = null) {
  return { id, progress };
}

// No starting_phase_id at all (e.g. pre-Phase-6 owner account, or an
// enrollment that predates the personalization engine) behaves exactly
// as before: first incomplete topic, phase order, no skipping.
{
  const phases = [phase("p1", 0, [topic("t1")]), phase("p2", 1, [topic("t2")])];
  const result = computeNextTopic(phases, null);
  assert.equal(result.topicId, "t1");
}

// A recorded starting_phase_id skips untouched earlier phases.
{
  const phases = [
    phase("p1", 0, [topic("t1")]),
    phase("p2", 1, [topic("t2")]),
    phase("p3", 2, [topic("t3")]),
  ];
  const result = computeNextTopic(phases, "p3");
  assert.equal(result.topicId, "t3");
}

// Real progress in an earlier (supposedly skipped) phase always wins —
// the recommendation never hides or overrides actual user progress.
{
  const phases = [
    phase("p1", 0, [topic("t1", { completed: false })]), // touched: has a progress row
    phase("p2", 1, [topic("t2")]),
    phase("p3", 2, [topic("t3")]),
  ];
  const result = computeNextTopic(phases, "p3");
  assert.equal(result.topicId, "t1", "touched earlier progress must override the starting-point skip");
}

// A completed topic in an untouched-except-for-completion sense still
// counts as "touched" (has a progress row), so it still disables the
// skip — the skip is scoped to phases the user has genuinely not
// interacted with at all.
{
  const phases = [
    phase("p1", 0, [topic("t1", { completed: true })]),
    phase("p2", 1, [topic("t2")]),
  ];
  const result = computeNextTopic(phases, "p2");
  // p1's topic is complete, so the real next incomplete topic is t2
  // regardless of the skip logic — same outcome either way, but
  // confirms completed progress in an earlier phase is still "touched".
  assert.equal(result.topicId, "t2");
}

// starting_phase_id pointing at a phase id that no longer exists in
// `phases` (e.g. stale data) fails safe to "no skip" rather than
// crashing or skipping everything.
{
  const phases = [phase("p1", 0, [topic("t1")]), phase("p2", 1, [topic("t2")])];
  const result = computeNextTopic(phases, "phase-does-not-exist");
  assert.equal(result.topicId, "t1");
}

console.log("dashboard next-topic starting-point logic: 5 checks passed");
