-- Tracks which individual bullet items within a manual lesson section
-- (e.g. "PRACTICE PROBLEMS", "HANDS-ON CODING") a user has checked off.
-- The manual's content (src/data/manual-days.json) is static free text, not
-- discrete DB rows, so an item is identified by its position rather than
-- its own id: (day_number, section_title, item_index) — item_index is the
-- bullet's position within that section's parsed content, 0-based.
--
-- Keyed by day_number (not topic_id) since the same day's lesson can be
-- reached via multiple mapped topics in rare cases, and the checklist
-- state is really "have I done this exercise from the manual", which is a
-- property of the lesson content itself, not any one topic pointing to it.
create table if not exists public.manual_item_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number int not null,
  section_title text not null,
  item_index int not null,
  checked_at timestamptz not null default now(),
  primary key (user_id, day_number, section_title, item_index)
);

alter table public.manual_item_checks enable row level security;

create policy "own rows: manual_item_checks" on public.manual_item_checks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
