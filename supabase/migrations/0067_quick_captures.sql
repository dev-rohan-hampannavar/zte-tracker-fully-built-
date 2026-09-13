-- ============================================================================
-- Items 10, 13, 18: lightweight capture. A new table, not an extension of
-- daily_logs or activity_log:
--   - daily_logs is one retrospective row per day (learned/mistakes/wins),
--     filled in looking back — the opposite of "jot this down right now
--     mid-task" (item 10's whole point).
--   - activity_log is a derived audit trail the app writes about actions
--     that already happened elsewhere (topic completed, application
--     created) — never a place the user types free text into directly.
-- quick_captures is the missing third thing: freeform, timestamped,
-- optionally linked to whatever the person was looking at, with a
-- `resolved_at` so a blocker (item 13) can be flagged and later cleared
-- without deleting the record. `source` distinguishes text vs. voice
-- input (item 18) without needing a second table — voice capture is a
-- different input method into the same store, not a different concept.
-- ============================================================================

create table if not exists public.quick_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  kind text not null default 'idea' check (kind in ('idea', 'blocker')),
  source text not null default 'text' check (source in ('text', 'voice')),
  -- Optional context: what page/entity the person was on when they
  -- captured this, so it can later be shown alongside that item (e.g. a
  -- blocker logged from a topic page can surface on that topic again).
  context_entity_type text,
  context_entity_id text,
  context_label text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists quick_captures_user_id_idx on public.quick_captures(user_id, created_at desc);
create index if not exists quick_captures_unresolved_idx on public.quick_captures(user_id) where resolved_at is null;

alter table public.quick_captures enable row level security;

create policy "quick_captures_select_own" on public.quick_captures
  for select using (auth.uid() = user_id);
create policy "quick_captures_insert_own" on public.quick_captures
  for insert with check (auth.uid() = user_id);
create policy "quick_captures_update_own" on public.quick_captures
  for update using (auth.uid() = user_id);
create policy "quick_captures_delete_own" on public.quick_captures
  for delete using (auth.uid() = user_id);

comment on table public.quick_captures is
  'Freeform stray ideas and blockers, captured immediately rather than retrospectively (unlike daily_logs). kind=blocker + resolved_at powers item 13''s quick-tag; source distinguishes text vs. voice input (item 18) into the same store.';
