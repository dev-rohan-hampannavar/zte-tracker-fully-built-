-- ============================================================
-- Seed: Rohan's career plan settings and financial profile
-- Run ONCE after migration 0067_career_system_merge.sql.
--
-- These are the values from career_tracker.xlsx (Start sheet).
-- All marked as "example" in the doc — replace with real figures
-- via the Settings UI once the page is updated.
--
-- The user_id must be replaced with Rohan's actual Supabase auth UID.
-- Find it with:
--   SELECT id FROM auth.users WHERE email = '<your email>';
-- ============================================================

-- Set a variable for the user ID. Supabase SQL editor does not support
-- \set, so replace :USER_ID with the actual UUID string below.
-- Example:
--   DO $$ DECLARE user_id uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; ...

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- *** REPLACE THIS LINE with your actual user ID ***
  -- SELECT id INTO target_user_id FROM auth.users WHERE email = 'your@email.com';
  -- For now, we use the "first user" approach for a single-user deployment:
  SELECT id INTO target_user_id FROM auth.users ORDER BY created_at LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found — log in via the app first, then re-run this script.';
  END IF;

  -- ---- 1. Career plan settings in user_settings ----------------
  UPDATE user_settings
  SET
    career_plan_start_date     = '2026-09-21',
    career_plan_weekly_hours   = 30,
    career_plan_track          = 'plan_a',
    career_plan_flagship_project = 'ClientSync'
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE WARNING 'user_settings row not found for %. Create it by visiting the app once.', target_user_id;
  END IF;

  -- ---- 2. Financial profile ------------------------------------
  -- Uses ON CONFLICT so it's safe to re-run (idempotent).
  INSERT INTO financial_profiles (
    user_id,
    monthly_income,        -- ₹28,000/month in-hand (from original timeline)
    monthly_expenses,      -- ₹22,000/month (example — replace with real figure)
    savings,               -- ₹0 (example — replace with actual liquid savings)
    emergency_months,      -- 6 months runway target
    minimum_switch_salary, -- ₹7,00,000 = ₹7L annual (low end of Exit A band)
    notice_period_days,    -- 60 days (example — check Applied Materials offer letter)
    updated_at
  )
  VALUES (
    target_user_id,
    28000,
    22000,
    0,
    6,
    700000,
    60,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    monthly_income        = EXCLUDED.monthly_income,
    monthly_expenses      = EXCLUDED.monthly_expenses,
    savings               = COALESCE(NULLIF(financial_profiles.savings, 0), EXCLUDED.savings),
    emergency_months      = EXCLUDED.emergency_months,
    minimum_switch_salary = EXCLUDED.minimum_switch_salary,
    notice_period_days    = EXCLUDED.notice_period_days,
    updated_at            = now();
  -- Note: savings is only overwritten if it is currently 0 (i.e., default)
  -- so a user who has already updated their real savings won't have it
  -- reset to the example value on a re-run.

  RAISE NOTICE 'Career plan seed complete for user %.', target_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: The seeded values are examples from career_tracker.xlsx.';
  RAISE NOTICE 'Update these in the app Settings once the financial profile UI is live:';
  RAISE NOTICE '  - Monthly expenses (replace ₹22,000 with actual)';
  RAISE NOTICE '  - Savings so far (replace ₹0 with actual liquid savings)';
  RAISE NOTICE '  - Notice period days (check Applied Materials offer letter)';
END $$;

-- ---- 3. Seed career checkpoints as goals/milestones ----------
-- This creates the kill-criteria checkpoints from section 15 of the
-- career_timeline_zte.docx as real milestone rows in the app.
-- The goal is created once; milestones are upserted by title.

DO $$
DECLARE
  target_user_id uuid;
  checkpoint_goal_id uuid;
  start_date date := '2026-09-21';
BEGIN
  SELECT id INTO target_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF target_user_id IS NULL THEN RETURN; END IF;

  -- Create (or find) the career checkpoints goal
  INSERT INTO goals (user_id, title, description, category, priority, status)
  VALUES (
    target_user_id,
    'ZTE Career Checkpoints',
    'Kill criteria and progress gates from career_timeline_zte.docx §15. Each milestone marks a decision point.',
    'career',
    'critical',
    'active'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO checkpoint_goal_id;

  -- If the goal already existed, find its ID
  IF checkpoint_goal_id IS NULL THEN
    SELECT id INTO checkpoint_goal_id
    FROM goals
    WHERE user_id = target_user_id AND title = 'ZTE Career Checkpoints'
    LIMIT 1;
  END IF;

  IF checkpoint_goal_id IS NULL THEN
    RAISE WARNING 'Could not create or find checkpoints goal.';
    RETURN;
  END IF;

  -- Insert milestones (idempotent via title uniqueness check)
  -- Month 3: 390 h / minimum 270 h
  INSERT INTO milestones (goal_id, user_id, title, description, deadline, order_index)
  SELECT checkpoint_goal_id, target_user_id,
    'Month 3 checkpoint (390 h planned)',
    'Phases 01 and 01b done, Phase 02 ~60%. Minimum: 270 h. Two-week hours audit done and tracker updated. Below minimum: cut scope or recheck available hours.',
    (start_date + interval '3 months')::date,
    1
  WHERE NOT EXISTS (
    SELECT 1 FROM milestones WHERE goal_id = checkpoint_goal_id AND title LIKE 'Month 3 checkpoint%'
  );

  -- Month 6: 780 h / minimum 540 h
  INSERT INTO milestones (goal_id, user_id, title, description, deadline, order_index)
  SELECT checkpoint_goal_id, target_user_id,
    'Month 6 checkpoint (780 h planned)',
    'Phases 01–04 done, CivicBoard deployed. Minimum: 540 h. Below minimum: pause and reassess — is it interest or available time?',
    (start_date + interval '6 months')::date,
    2
  WHERE NOT EXISTS (
    SELECT 1 FROM milestones WHERE goal_id = checkpoint_goal_id AND title LIKE 'Month 6 checkpoint%'
  );

  -- Month 10: 1,235 h / minimum 900 h — Exit A gate
  INSERT INTO milestones (goal_id, user_id, title, description, deadline, order_index)
  SELECT checkpoint_goal_id, target_user_id,
    'Month 10 checkpoint — Exit A (1,235 h)',
    'Exit A gate: ClientSync live with green CI, Docker, readable README. Start applying. Minimum: 900 h. If missed: extend by 2 months once; if missed again, stop or slow down.',
    (start_date + interval '10 months')::date,
    3
  WHERE NOT EXISTS (
    SELECT 1 FROM milestones WHERE goal_id = checkpoint_goal_id AND title LIKE 'Month 10 checkpoint%'
  );

  -- Month 14: 1,748 h / minimum 1,270 h — Exit ★1 gate
  INSERT INTO milestones (goal_id, user_id, title, description, deadline, order_index)
  SELECT checkpoint_goal_id, target_user_id,
    'Month 14 checkpoint — Exit ★1 (1,748 h)',
    'Phase 08 DSA done. First interview loops. Minimum: 1,270 h. If zero interviews after 60 tailored applications + 10 referral asks: fix portfolio and resume first.',
    (start_date + interval '14 months')::date,
    4
  WHERE NOT EXISTS (
    SELECT 1 FROM milestones WHERE goal_id = checkpoint_goal_id AND title LIKE 'Month 14 checkpoint%'
  );

  -- Month 18: first offer gate (no hours floor — it's a market outcome)
  INSERT INTO milestones (goal_id, user_id, title, description, deadline, order_index)
  SELECT checkpoint_goal_id, target_user_id,
    'Month 18 checkpoint — first dev offer',
    'At least one dev offer above current ops pay (₹4.6L CTC baseline). If none: stay in ops, treat dev as internal/side skill, consider MBA. This is the final kill-criteria gate.',
    (start_date + interval '18 months')::date,
    5
  WHERE NOT EXISTS (
    SELECT 1 FROM milestones WHERE goal_id = checkpoint_goal_id AND title LIKE 'Month 18 checkpoint%'
  );

  RAISE NOTICE 'Career checkpoints seeded under goal %.', checkpoint_goal_id;
END $$;
