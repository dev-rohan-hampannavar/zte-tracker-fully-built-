-- ============================================================
-- Migration 0067: Career system merge (idempotent version)
-- Safe to run multiple times.
-- ============================================================

-- ---- 1. exit_ladder: add exit_hours_required ----------------
ALTER TABLE exit_ladder
  ADD COLUMN IF NOT EXISTS exit_hours_required INTEGER;

UPDATE exit_ladder SET exit_hours_required = 1235  WHERE exit_code = 'E01';
UPDATE exit_ladder SET exit_hours_required = 1346  WHERE exit_code = 'E02';
UPDATE exit_ladder SET exit_hours_required = 1417  WHERE exit_code = 'E03';
UPDATE exit_ladder SET exit_hours_required = 1748  WHERE exit_code = 'E04';
UPDATE exit_ladder SET exit_hours_required = 1949  WHERE exit_code = 'E05';
UPDATE exit_ladder SET exit_hours_required = 2113  WHERE exit_code = 'E06';
UPDATE exit_ladder SET exit_hours_required = 2320  WHERE exit_code = 'E07';
UPDATE exit_ladder SET exit_hours_required = 2943  WHERE exit_code = 'E08';
UPDATE exit_ladder SET exit_hours_required = 3034  WHERE exit_code = 'E09';

-- ---- 2. financial_profiles: add notice_period_days ----------
ALTER TABLE financial_profiles
  ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 60;

-- ---- 3. career_scenarios ------------------------------------
CREATE TABLE IF NOT EXISTS career_scenarios (
  id          SERIAL PRIMARY KEY,
  path        TEXT NOT NULL CHECK (path IN ('ops', 'dev')),
  scenario    TEXT NOT NULL CHECK (scenario IN ('low', 'base', 'high')),
  age_points  JSONB NOT NULL,
  anchor      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE career_scenarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'career_scenarios' AND policyname = 'career_scenarios_read'
  ) THEN
    CREATE POLICY "career_scenarios_read" ON career_scenarios
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

INSERT INTO career_scenarios (path, scenario, age_points, anchor)
SELECT * FROM (VALUES
  ('ops', 'low',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":5.5},{"age":28,"ctc_lpa":8.0},{"age":31,"ctc_lpa":12.5},{"age":34,"ctc_lpa":17.0}]'::jsonb,
   'SC analyst track: ₹6–12L at 3–6 yrs, ₹12–20L at 7+ (EICTA, IIT Kanpur, Apr 2026)'),
  ('ops', 'base',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":7.0},{"age":28,"ctc_lpa":11.0},{"age":31,"ctc_lpa":18.0},{"age":34,"ctc_lpa":26.0}]'::jsonb,
   'Analyst to manager by ~30: manager ₹12–22L at 3–6 yrs, ₹25–45L at 7+ (EICTA)'),
  ('ops', 'high',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":8.5},{"age":28,"ctc_lpa":14.0},{"age":31,"ctc_lpa":24.0},{"age":34,"ctc_lpa":36.0}]'::jsonb,
   'Fast manager track with sponsor or MBA; matches original timeline ops figures'),
  ('dev', 'low',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":4.0},{"age":28,"ctc_lpa":6.5},{"age":31,"ctc_lpa":10.5},{"age":34,"ctc_lpa":15.0}]'::jsonb,
   'IT-services/agency: fresher ₹3.5–5L; Bangalore 1–5 yrs avg ₹9–10L (Futurense, upGrad, Aug 2026)'),
  ('dev', 'base',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":7.0},{"age":28,"ctc_lpa":11.0},{"age":31,"ctc_lpa":17.0},{"age":34,"ctc_lpa":25.0}]'::jsonb,
   'Startup/mid product: fresher ₹6–9L; 1–5 yrs top-10% ₹17L; senior full-stack ₹16–28L (upGrad, Codegnan)'),
  ('dev', 'high',
   '[{"age":24,"ctc_lpa":4.6},{"age":26,"ctc_lpa":12.0},{"age":28,"ctc_lpa":20.0},{"age":31,"ctc_lpa":32.0},{"age":34,"ctc_lpa":45.0}]'::jsonb,
   'Product/GCC after ZTE ★1+: Exit B ₹8–12L, ★2 ₹15–25L, Exit 3 ₹25–40L; leads ₹28–50L+')
) AS v(path, scenario, age_points, anchor)
WHERE NOT EXISTS (SELECT 1 FROM career_scenarios);

-- ---- 4. career_pivots ---------------------------------------
CREATE TABLE IF NOT EXISTS career_pivots (
  id                  SERIAL PRIMARY KEY,
  code                TEXT NOT NULL,
  path                TEXT NOT NULL CHECK (path IN ('ops', 'dev', 'both', 'product')),
  title               TEXT NOT NULL,
  entry_range         TEXT,
  mid_range           TEXT,
  mid_experience_note TEXT,
  senior_range        TEXT,
  confidence          TEXT CHECK (confidence IN ('H', 'M', 'L')),
  source              TEXT,
  why_it_fits         TEXT,
  barrier             TEXT,
  first_step          TEXT,
  order_index         INTEGER NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE career_pivots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'career_pivots' AND policyname = 'career_pivots_read'
  ) THEN
    CREATE POLICY "career_pivots_read" ON career_pivots
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

INSERT INTO career_pivots
  (code, path, title, entry_range, mid_range, mid_experience_note, senior_range, confidence, source, why_it_fits, barrier, first_step, order_index)
SELECT * FROM (VALUES
  ('O1','ops','Supply-chain analytics and demand planning','₹4–8L','₹8–16L',NULL,'₹16–28L','M','EICTA, IIT Kanpur (Apr 2026)','Already work with order/supply flow; domain knowledge is the hard-to-hire part, tooling is teachable.','Low','Automate one recurring report at work with SQL and a dashboard; record time saved.',1),
  ('O2','ops','Business systems analyst and ERP consultant (Oracle, SAP supply chain)','₹4–8L','₹10–22L',NULL,'₹25–50L+','L','One job-guide aggregator','Sits between operations and IT; requirements gathering is the core skill, not coding.','Medium','Ask the supply-chain systems team what they look for; shadow one project or support ticket.',2),
  ('O3','product','Product management (operations-heavy and B2B products)','₹8–22L','₹22–42L','2–5 yrs','₹40–70L','M','EICTA; Instahyre (May 2026)','Ops teams are the users of many B2B and internal products; process pain points become product ideas.','High','Write one product-style proposal for an internal ops problem (problem, metric, options, recommendation).',3),
  ('O4','ops','Procurement and strategic sourcing','₹4–9L','₹10–18L',NULL,'₹18–28L','M','EICTA','Close to order/supply operations; safe move with a lower ceiling than O1–O3.','Low',NULL,4),
  ('O5','both','Technical program management',NULL,'₹50.9L median (all levels)',NULL,NULL,'L','Levels.fyi (Jul 2026); Indeed Bengaluru avg ₹19.6L','Ops delivery experience counts; with ZTE Phases 01–07 fluency it becomes credible.','High','Note as a mid-career target; lead one cross-team project at work.',5),
  ('O6','ops','Stay in ops and grow into management','₹5–10L','₹12–22L',NULL,'₹25–45L','M','EICTA','Baseline for all comparisons; lowest risk, competitive with mid-level dev base case.','Medium',NULL,6),
  ('D1','dev','DevOps, SRE and platform engineering','₹5–9L','₹12–22L','2–4 yrs','₹25–55L','M','Instahyre (May 2026); Second Talent (Sep 2026)','ZTE Phase 06 (CI/CD, Docker), Phase 10 (monitoring), Phase 16 (infrastructure) are the core.','Medium','After Phase 06, ship ClientSync through a real pipeline and write up an incident-style note on one failure.',7),
  ('D2','dev','AI and GenAI engineering','₹5–8L','₹12–25L',NULL,'₹25–50L','M','EICTA; Second Talent; Instahyre','ZTE Phase 12 (AI/RAG, 207 hours) adds application-layer AI to a full-stack base.','Medium','After Phase 12, add one RAG feature to ClientSync with a written evaluation of where it fails.',8),
  ('D3','dev','Data engineering','₹4L+ (services)','₹8.8–9.8L avg (all levels)',NULL,'₹80L+ (product/GCC)','M','Futurense (Aug 2026)','SQL (Phase 01) and PostgreSQL internals (Phase 11) help; real skills gap outside ZTE.','Medium',NULL,9),
  ('D4','product','Technical product management','₹18L avg','₹28L avg','2–5 yrs','₹47L avg','M','Recrew (2026)','Engineer to PM inside company after 3–5 years; technical credibility plus product judgement.','High',NULL,10),
  ('D5','dev','Senior individual-contributor track (backend depth to staff engineer)',NULL,'₹16–28L',NULL,'₹28–50L+','M','Codegnan (Jul 2026); ZTE bands','The default ladder. ZTE Phases 05, 11, 17 are the depth accelerators.','Medium',NULL,11)
) AS v(code, path, title, entry_range, mid_range, mid_experience_note, senior_range, confidence, source, why_it_fits, barrier, first_step, order_index)
WHERE NOT EXISTS (SELECT 1 FROM career_pivots);

-- ---- 5. Index -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exit_ladder_hours
  ON exit_ladder (exit_hours_required)
  WHERE exit_hours_required IS NOT NULL;

-- ---- End of migration 0067 ----------------------------------
