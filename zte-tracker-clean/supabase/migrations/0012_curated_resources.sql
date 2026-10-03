-- ============================================================================
-- ZTE Tracker — Stage 0 / Item 43: Resource Library — curated seed data
-- topic_resources previously only stored user-added links (0009). This adds
-- a `curated` flag so pre-reviewed official docs/MDN/RFC links shipped with
-- the app render distinctly from a user's own additions, and relaxes the
-- table to support system-owned rows (curated rows have no user_id).
-- Additive only.
-- ============================================================================

alter table public.topic_resources
  add column if not exists curated boolean not null default false;

-- Curated rows are shipped with the app, not owned by any one user — allow
-- user_id to be null for those rows while user-added rows keep it required
-- at the application layer (curated=false always sets user_id).
alter table public.topic_resources
  alter column user_id drop not null;

create index if not exists idx_topic_resources_curated on public.topic_resources(topic_id, curated);

-- Curated resources are static content: readable by any authenticated user,
-- writable only via service role (admin import), same pattern as phases/topics.
create policy "static read: curated topic_resources" on public.topic_resources
  for select to authenticated
  using (curated = true);
