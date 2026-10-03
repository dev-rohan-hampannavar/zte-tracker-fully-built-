-- Maps a roadmap topic to its corresponding "Day N" lesson plan in the
-- Zero to Dangerous execution manual (src/data/manual-days.json). The
-- manual's day numbering doesn't line up 1:1 with topics.order_index —
-- some days cover multiple topics' worth of ground, and manual day titles
-- don't match topic titles verbatim — so this is a small hand-filled
-- lookup table rather than something derivable automatically.
--
-- Not every topic needs a row: Daily Mission simply has no expandable
-- lesson content for topics left unmapped.
create table if not exists public.topic_day_map (
  topic_id text primary key references public.topics(id) on delete cascade,
  day_number int not null,
  created_at timestamptz not null default now()
);

alter table public.topic_day_map enable row level security;

-- Reference data — same read-for-authenticated / write-nobody-from-client
-- pattern as phases/topics/exit_ladder in 0001_init.sql.
create policy "static read: topic_day_map" on public.topic_day_map for select to authenticated using (true);
