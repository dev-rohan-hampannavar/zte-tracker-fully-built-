-- ============================================================================
-- Community Leaderboard (P2).
--
-- public_streak_summary (0021) already implements exactly the right
-- pattern for this: a narrow, purpose-built public table synced app-side
-- from private data, readable by anyone only when the SAME
-- user_settings.public_profile_enabled flag used by the public profile
-- page is true. Extending that table (not inventing a parallel
-- "leaderboard_entries" table) keeps one opt-in flag controlling all
-- public surfaces, and one sync path to keep correct.
--
-- Deliberately only surfaces phases_completed and streak — not DSA count,
-- not applications, not salary, not anything career/job-search related.
-- A public leaderboard ranking who has the most job applications or
-- interview offers would be actively harmful (pressure, comparison
-- anxiety, and it leaks career-search activity some people keep private
-- even when they're fine sharing curriculum progress). Streak and phase
-- completion are the same category of "public showcase" data the
-- existing /u/[slug] profile page already exposes for opted-in users.
-- ============================================================================

alter table public.public_streak_summary add column if not exists phases_completed int not null default 0;

-- Public leaderboard view: only rows for users who are opted in AND have
-- a display_name set (an anonymous "wishlist" username shouldn't clutter
-- a public ranking). Ordered by phases_completed then current_streak so
-- the ranking rewards real progress, not just a currently-running streak.
create or replace view public.leaderboard as
select
  s.user_id,
  us.display_name,
  us.public_profile_bio,
  us.public_profile_slug,
  s.phases_completed,
  s.current_streak,
  s.best_streak,
  s.total_days_logged
from public.public_streak_summary s
join public.user_settings us on us.user_id = s.user_id
where us.public_profile_enabled = true and us.display_name is not null
order by s.phases_completed desc, s.current_streak desc;

grant select on public.leaderboard to anon, authenticated;
