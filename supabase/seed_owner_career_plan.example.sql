-- ============================================================
-- TEMPLATE: seed career-plan settings and a financial profile for ONE account.
-- Not a migration. Copy this file to seed_owner_career_plan.local.sql (which is
-- git-ignored), fill in the placeholders, and run it once manually.
-- Never commit real emails or financial figures.
-- ============================================================

DO $$
DECLARE
  target_user_id uuid;
  target_email text := 'you@example.com';   -- <-- your account email
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %.', target_email;
  END IF;

  UPDATE user_settings
  SET career_plan_start_date       = CURRENT_DATE,
      career_plan_weekly_hours     = 20,          -- <-- your weekly study hours
      career_plan_track            = 'plan_a',
      career_plan_flagship_project = 'ClientSync' -- <-- your flagship project
  WHERE user_id = target_user_id;

  INSERT INTO financial_profiles (
    user_id, monthly_income, monthly_expenses, savings,
    emergency_months, minimum_switch_salary, notice_period_days, updated_at
  )
  VALUES (target_user_id, 0, 0, 0, 6, 0, 30, now())   -- <-- your real figures
  ON CONFLICT (user_id) DO NOTHING;
END $$;
