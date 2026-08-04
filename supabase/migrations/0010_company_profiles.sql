-- ============================================================================
-- ZTE Tracker — Stage 0 / Item 3: Company Profiles — extend schema
-- The companies table was id+name only, with nothing else to render even if
-- a detail UI were built. This adds Category, Hiring Stage, Tech Stack, and
-- Hiring Difficulty per company. Additive only.
--
-- hiring_difficulty is left nullable and is NOT backfilled by the parser or
-- seed script — roadmap.md states no per-company difficulty rating anywhere,
-- and inventing one would misrepresent the source document, consistent with
-- the honest-gap approach already taken in companies/[id]/page.tsx.
-- ============================================================================

alter table public.companies
  add column if not exists category text,
  add column if not exists hiring_stage text,
  add column if not exists typical_tech_stack text[] default '{}',
  add column if not exists hiring_difficulty text
    check (hiring_difficulty is null or hiring_difficulty in ('low', 'medium', 'high')),
  add column if not exists notes text;
