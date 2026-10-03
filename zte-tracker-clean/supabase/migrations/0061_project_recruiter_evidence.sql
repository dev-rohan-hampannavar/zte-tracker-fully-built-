-- Spec section 31 (Recruiter-Facing Project Evidence) asks for a project
-- to carry: Problem, Architecture, Technologies (already covered
-- elsewhere via topic/skill linkage), Contribution, Challenges,
-- Trade-offs, Metrics, Screenshots (already exists), GitHub (already
-- exists), Live demo (already exists), Tests, Deployment (already
-- exists via deployment_url), Documentation.
--
-- Before this, project_progress had only github_url/deployment_url/
-- demo_url/screenshots/notes — everything else got crammed into one
-- unstructured free-text notes field, which can't be presented to a
-- recruiter as distinct, scannable sections the way the spec describes.
--
-- Added as nullable text columns (not a jsonb blob) to keep them
-- queryable/exportable the same way every other project_progress column
-- already is, and so existing UI code that does `select("*")` or spreads
-- rows keeps working with no changes needed beyond what actually renders
-- these fields.

alter table public.project_progress
  add column if not exists problem_statement text,
  add column if not exists architecture_notes text,
  add column if not exists contribution_notes text,
  add column if not exists challenges_notes text,
  add column if not exists tradeoffs_notes text,
  add column if not exists metrics_notes text,
  add column if not exists testing_notes text,
  add column if not exists documentation_url text;
