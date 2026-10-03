-- ============================================================================
-- Stage 5 — Item 51: Workspace (pin items)
-- JSON column on user_settings rather than a new table: pinned items are a
-- small, per-user, order-sensitive list (not something that needs its own
-- RLS policy or relational joins) — same reasoning `last_expanded_accordion`
-- (already a text[] on this table) used for a similar small per-user list.
-- ============================================================================

alter table public.user_settings
  add column if not exists pinned_items jsonb not null default '[]'::jsonb;

comment on column public.user_settings.pinned_items is
  'Array of {type: "topic"|"project"|"clientsync_milestone", id: string, label: string, pinned_at: string} objects, max 8, most-recent-first.';
