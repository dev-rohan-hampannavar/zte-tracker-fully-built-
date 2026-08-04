-- ============================================================================
-- ZTE Tracker — P7.6: Resource library
-- roadmap.md contains no curated docs/videos per topic — no such content
-- exists anywhere in the source data to seed. Rather than fabricate links
-- (which would mean inventing URLs no one has verified), this gives each
-- user a real place to build their own per-topic resource library as they
-- study — the actually-curated version, curated by the person using it.
-- Additive only.
-- ============================================================================

create table if not exists public.topic_resources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null references public.topics(id) on delete cascade,
  title text not null,
  url text not null,
  resource_type text not null default 'link' check (resource_type in ('doc', 'video', 'article', 'link')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_topic_resources_user_topic on public.topic_resources(user_id, topic_id);

alter table public.topic_resources enable row level security;

create policy "users manage own topic_resources" on public.topic_resources
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
