-- ============================================================================
-- FIX: public profile (/u/[slug] and /api/public/[slug]) is broken for
-- logged-out visitors.
--
-- Root cause: 0001_init.sql granted read access to "phases" and "topics"
-- (and "capstones", added in 0004) only to the `authenticated` role:
--
--   create policy "static read: phases" on public.phases
--     for select to authenticated using (true);
--   create policy "static read: topics" on public.topics
--     for select to authenticated using (true);
--   create policy "static read: capstones" on public.capstones
--     for select to authenticated using (true);
--
-- 0003_public_profile.sql / 0021_public_profile_showcase.sql added opt-in
-- `anon` read policies for topic_progress / dsa_progress / project_progress
-- / user_settings / build_in_public_status / public_streak_summary, and
-- 0004_part_one_reference.sql separately opened orientation /
-- why_this_works / master_phase_table / navigation_notes to anon — but
-- phases, topics, and capstones were missed.
--
-- /u/[slug]/page.tsx (the actual public profile page) queries phases,
-- topics, AND capstones unfiltered, and runs with the anon-key client for
-- unauthenticated visitors. /api/public/[slug]/route.ts queries
-- phases/topics the same way. Under RLS this silently returns empty
-- arrays to anyone not logged in — i.e. every actual visitor to a shared
-- public profile link sees 0/0 topics, an empty phase breakdown, missing
-- capstone project titles, and 0% overall progress, even though the
-- profile owner opted in and has real progress.
--
-- These three tables are non-sensitive static reference content (titles/
-- order only, no per-user data), so it's safe to open them to anon the
-- same way they're already open to any authenticated user, and the same
-- way orientation/why_this_works/master_phase_table/navigation_notes
-- already are.
-- ============================================================================

create policy "static read (anon): phases" on public.phases
  for select to anon using (true);

create policy "static read (anon): topics" on public.topics
  for select to anon using (true);

create policy "static read (anon): capstones" on public.capstones
  for select to anon using (true);
