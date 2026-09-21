-- ============================================================
-- Migration 0067: Career system merge
--
-- Extends two existing tables with missing columns, creates two
-- new seeded-read-only reference tables, and seeds all reference
-- data from the career_timeline_zte.docx and career_tracker.xlsx.
--
-- Zero destructive changes. Safe rollback:
--   ALTER TABLE exit_ladder DROP COLUMN IF EXISTS exit_hours_required;
--   ALTER TABLE financial_profiles DROP COLUMN IF EXISTS notice_period_days;
--   DROP TABLE IF EXISTS career_pivots;
--   DROP TABLE IF EXISTS career_scenarios;
-- ============================================================

-- ---- 1. exit_ladder: add exit_hours_required -------------------
-- This is the critical missing link: the docs map each exit code
-- to a cumulative hours requirement. The existing exit_ladder has
-- salary bands and linked_phase but not hours.

ALTER TABLE exit_ladder
  ADD COLUMN IF NOT EXISTS exit_hours_required INTEGER;

-- Seed hours per exit code (matched by exit_code, not linked_phase,
-- since exit_code is the canonical identifier in exit_ladder).
-- Values sourced from career_tracker.xlsx Exit Plan sheet and
-- career_timeline_zte.docx section 8.
-- NOTE: Update the WHERE clause values to match your actual exit_code
-- values if they differ from E01–E09; inspect with:
--   SELECT exit_code, linked_phase, name FROM exit_ladder ORDER BY order_index;

UPDATE exit_ladder SET exit_hours_required = 1235  WHERE exit_code = 'E01'; -- Exit A,  Phase 06
UPDATE exit_ladder SET exit_hours_required = 1346  WHERE exit_code = 'E02'; -- Exit A2, Phase 06b
UPDATE exit_ladder SET exit_hours_required = 1417  WHERE exit_code = 'E03'; -- Exit B,  Phase 07
UPDATE exit_ladder SET exit_hours_required = 1748  WHERE exit_code = 'E04'; -- Exit ★1, Phase 08
UPDATE exit_ladder SET exit_hours_required = 1949  WHERE exit_code = 'E05'; -- Exit C,  Phase 10
UPDATE exit_ladder SET exit_hours_required = 2113  WHERE exit_code = 'E06'; -- Exit ★2, Phase 11
UPDATE exit_ladder SET exit_hours_required = 2320  WHERE exit_code = 'E07'; -- Exit D,  Phase 12
UPDATE exit_ladder SET exit_hours_required = 2943  WHERE exit_code = 'E08'; -- Exit 3,  Phase 17
UPDATE exit_ladder SET exit_hours_required = 3034  WHERE exit_code = 'E09'; -- Exit E,  Phase 19

-- ---- 2. financial_profiles: add notice_period_days --------------
-- The spreadsheet's "Start" sheet has notice_period_days as an
-- explicit user input (default 60 days at many Indian companies).
-- Needed for career runway calculations: don't start applying until
-- savings runway > notice_period.

ALTER TABLE financial_profiles
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 60;

-- ---- 3. career_scenarios: low/base/high salary model -----------
-- Reference data only — no user data, no RLS needed (any authenticated
-- user can read, no writes via application). Stores the scenario model
-- from career_tracker.xlsx (Scenarios sheet) and sections 3, 25 of the
-- timeline doc: illustrative CTC points for ops and dev paths at each
-- age, with source citations.

CREATE TABLE IF NOT EXISTS career_scenarios (
  id          SERIAL PRIMARY KEY,
  path        TEXT NOT NULL CHECK (path IN ('ops', 'dev')),
  scenario    TEXT NOT NULL CHECK (scenario IN ('low', 'base', 'high')),
  -- JSONB array of {age: number, ctc_lpa: number} objects, ordered by age.
  -- Canonical ages: 24, 26, 28, 31, 34.
  age_points  JSONB NOT NULL,
  -- Human-readable source citation for the interpolation anchors.
  anchor      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: read-only for authenticated users; no user writes.
ALTER TABLE career_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_scenarios_read" ON career_scenarios
  FOR SELECT TO authenticated USING (true);

-- Seed scenario data (from Scenarios sheet, rows 5–10).
-- These are the five age-point anchors; the application interpolates
-- between them for year-by-year projections.

INSERT INTO career_scenarios (path, scenario, age_points, anchor)
VALUES
  ('ops', 'low',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":5.5},{"age":28,"ctc_lpa":8.0},{"age":31,"ctc_lpa":12.5},{"age":34,"ctc_lpa":17.0}]',
   'SC analyst track: ₹6–12L at 3–6 yrs, ₹12–20L at 7+ (EICTA, IIT Kanpur, Apr 2026)'),

  ('ops', 'base',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":7.0},{"age":28,"ctc_lpa":11.0},{"age":31,"ctc_lpa":18.0},{"age":34,"ctc_lpa":26.0}]',
   'Analyst to manager by ~30: manager ₹12–22L at 3–6 yrs, ₹25–45L at 7+ (EICTA)'),

  ('ops', 'high',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":8.5},{"age":28,"ctc_lpa":14.0},{"age":31,"ctc_lpa":24.0},{"age":34,"ctc_lpa":36.0}]',
   'Fast manager track with sponsor or MBA; matches original timeline ops figures'),

  ('dev', 'low',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":4.0},{"age":28,"ctc_lpa":6.5},{"age":31,"ctc_lpa":10.5},{"age":34,"ctc_lpa":15.0}]',
   'IT-services/agency: fresher ₹3.5–5L; Bangalore 1–5 yrs avg ₹9–10L (Futurense, upGrad, Aug 2026)'),

  ('dev', 'base',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":7.0},{"age":28,"ctc_lpa":11.0},{"age":31,"ctc_lpa":17.0},{"age":34,"ctc_lpa":25.0}]',
   'Startup/mid product: fresher ₹6–9L; 1–5 yrs top-10% ₹17L; senior full-stack ₹16–28L (upGrad, Codegnan)'),

  ('dev', 'high',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":12.0},{"age":28,"ctc_lpa":20.0},{"age":31,"ctc_lpa":32.0},{"age":34,"ctc_lpa":45.0}]',
   'Product/GCC after ZTE ★1+: Exit B ₹8–12L, ★2 ₹15–25L, Exit 3 ₹25–40L; leads ₹28–50L+');

-- ---- 4. career_pivots: reference pivot table -------------------
-- Static reference data from the Pivots sheet and sections 26–28.
-- No user data. Read-only for any authenticated user.

CREATE TABLE IF NOT EXISTS career_pivots (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL,       -- 'O1'–'O6', 'D1'–'D5'
  path          TEXT NOT NULL CHECK (path IN ('ops', 'dev', 'both', 'product')),
  title         TEXT NOT NULL,
  entry_range   TEXT,                -- e.g. '₹3–6 LPA'
  mid_range     TEXT,                -- at 3–6 yrs unless mid_experience_note set
  mid_experience_note TEXT,          -- e.g. '2–4 yrs' when different from default
  senior_range  TEXT,                -- at 7+ yrs
  confidence    TEXT CHECK (confidence IN ('H', 'M', 'L')),
  source        TEXT,
  why_it_fits   TEXT,
  barrier       TEXT,                -- 'Low' | 'Medium' | 'High'
  first_step    TEXT,
  order_index   INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE career_pivots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_pivots_read" ON career_pivots
  FOR SELECT TO authenticated USING (true);

-- Seed from Pivots sheet + sections 26–27 of the timeline doc.
INSERT INTO career_pivots
  (code, path, title, entry_range, mid_range, mid_experience_note, senior_range, confidence, source, why_it_fits, barrier, first_step, order_index)
VALUES
  ('O1', 'ops',
   'Supply-chain analytics and demand planning',
   '₹4–8L', '₹8–16L', NULL, '₹16–28L',
   'M', 'EICTA, IIT Kanpur (Apr 2026)',
   'Already work with order/supply flow; domain knowledge is the hard-to-hire part, tooling is teachable.',
   'Low',
   'Automate one recurring report at work with SQL and a dashboard; record time saved.',
   1),

  ('O2', 'ops',
   'Business systems analyst and ERP consultant (Oracle, SAP supply chain)',
   '₹4–8L', '₹10–22L', NULL, '₹25–50L+',
   'L', 'One job-guide aggregator',
   'Sits between operations and IT; requirements gathering is the core skill, not coding.',
   'Medium',
   'Ask the supply-chain systems team what they look for; shadow one project or support ticket.',
   2),

  ('O3', 'product',
   'Product management (operations-heavy and B2B products)',
   '₹8–22L', '₹22–42L', '2–5 yrs', '₹40–70L',
   'M', 'EICTA; Instahyre (May 2026)',
   'Ops teams are the users of many B2B and internal products; process pain points become product ideas.',
   'High',
   'Write one product-style proposal for an internal ops problem (problem, metric, options, recommendation).',
   3),

  ('O4', 'ops',
   'Procurement and strategic sourcing',
   '₹4–9L', '₹10–18L', NULL, '₹18–28L',
   'M', 'EICTA',
   'Close to order/supply operations; safe move with a lower ceiling than O1–O3.',
   'Low',
   NULL,
   4),

  ('O5', 'both',
   'Technical program management',
   NULL, '₹50.9L median (all levels)', NULL, NULL,
   'L', 'Levels.fyi (Jul 2026); Indeed Bengaluru avg ₹19.6L',
   'Ops delivery experience counts; with ZTE Phases 01–07 fluency it becomes credible.',
   'High',
   'Note as a mid-career target; lead one cross-team project at work.',
   5),

  ('O6', 'ops',
   'Stay in ops and grow into management',
   '₹5–10L', '₹12–22L', NULL, '₹25–45L',
   'M', 'EICTA',
   'Baseline for all comparisons; lowest risk, competitive with mid-level dev base case.',
   'Medium',
   NULL,
   6),

  ('D1', 'dev',
   'DevOps, SRE and platform engineering',
   '₹5–9L', '₹12–22L', '2–4 yrs', '₹25–55L',
   'M', 'Instahyre (May 2026); Second Talent (Sep 2026)',
   'ZTE Phase 06 (CI/CD, Docker), Phase 10 (monitoring), Phase 16 (infrastructure) are the core.',
   'Medium',
   'After Phase 06, ship ClientSync through a real pipeline and write up an incident-style note on one failure.',
   7),

  ('D2', 'dev',
   'AI and GenAI engineering',
   '₹5–8L', '₹12–25L', NULL, '₹25–50L',
   'M', 'EICTA; Second Talent; Instahyre',
   'ZTE Phase 12 (AI/RAG, 207 hours) adds application-layer AI to a full-stack base.',
   'Medium',
   'After Phase 12, add one RAG feature to ClientSync with a written evaluation of where it fails.',
   8),

  ('D3', 'dev',
   'Data engineering',
   '₹4L+ (services)', '₹8.8–9.8L avg (all levels)', NULL, '₹80L+ (product/GCC)',
   'M', 'Futurense (Aug 2026)',
   'SQL (Phase 01) and PostgreSQL internals (Phase 11) help; real skills gap outside ZTE.',
   'Medium',
   NULL,
   9),

  ('D4', 'product',
   'Technical product management',
   '₹18L avg', '₹28L avg', '2–5 yrs', '₹47L avg',
   'M', 'Recrew (2026)',
   'Engineer to PM inside company after 3–5 years; technical credibility plus product judgement.',
   'High',
   NULL,
   10),

  ('D5', 'dev',
   'Senior individual-contributor track (backend depth to staff engineer)',
   NULL, '₹16–28L', NULL, '₹28–50L+',
   'M', 'Codegnan (Jul 2026); ZTE bands',
   'The default ladder. ZTE Phases 05, 11, 17 are the depth accelerators.',
   'Medium',
   NULL,
   11);

-- ---- 5. Index on new columns -----------------------------------

CREATE INDEX IF NOT EXISTS idx_exit_ladder_hours
  ON exit_ladder (exit_hours_required)
  WHERE exit_hours_required IS NOT NULL;

-- ---- End of migration 0067 ------------------------------------
