-- Personal facts about the account owner (employer, handle, degree, pay, age)
-- used to be written into the app's source code, which ships to every browser.
-- They now live in this table. Row-level security lets ONLY the verified owner
-- account (user_settings.is_owner) read them; there are no insert, update or
-- delete policies, so values can only be changed with the SQL editor or the
-- service role. The values themselves are never committed: put them in
-- supabase/seed_owner_facts.local.sql (git-ignored) and run it once.

create table if not exists public.owner_private_facts (
  key   text primary key check (char_length(key) between 1 and 60),
  value text not null
);

alter table public.owner_private_facts enable row level security;

drop policy if exists "owner_private_facts_owner_read" on public.owner_private_facts;
create policy "owner_private_facts_owner_read" on public.owner_private_facts
  for select to authenticated
  using (
    exists (
      select 1 from public.user_settings s
      where s.user_id = auth.uid() and s.is_owner = true
    )
  );

revoke insert, update, delete on public.owner_private_facts from authenticated, anon;
