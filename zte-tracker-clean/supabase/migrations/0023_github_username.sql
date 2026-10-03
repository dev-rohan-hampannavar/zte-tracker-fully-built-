-- GitHub username for the public profile's "recent activity" widget.
-- Uses GitHub's public REST API (/users/{username}/events/public) at
-- render time, which needs no auth token — so no secret to manage here,
-- just the username to query with.
alter table public.user_settings
  add column if not exists github_username text;

comment on column public.user_settings.github_username is
  'GitHub username shown/linked on the public profile when public_profile_enabled is true.';
