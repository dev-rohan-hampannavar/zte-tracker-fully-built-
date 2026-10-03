-- Pin the private (owner) workspace to one verified account and make the
-- owner/shared boundary tamper-proof.
--
-- Problem before this migration: routing depended on user_settings.is_personalized,
-- but the "own rows" RLS policy lets any signed-in user PATCH their own row, so a
-- shared user could set is_personalized = true (or delete + re-insert their row,
-- since the column default was true) and land in the owner experience.
--
-- After this migration:
--   * the owner is identified server-side by a verified email, not by app code;
--   * is_owner / is_personalized cannot be changed by client sessions;
--   * every other account defaults to the shared workspace + onboarding.

alter table public.user_settings
  add column if not exists is_owner boolean not null default false;

alter table public.user_settings
  alter column is_personalized set default false;

create or replace function public.is_owner_email(p_email text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_email, '')) = 'rohanhampannavar3@gmail.com';
$$;

-- Client sessions may never change the boundary columns. Trusted paths
-- (service role, the pin function below) set app.owner_pin for the txn.
create or replace function public.guard_workspace_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
     or coalesce(current_setting('app.owner_pin', true), '') = 'on' then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    new.is_owner := false;
    new.is_personalized := false;
  else
    new.is_owner := old.is_owner;
    new.is_personalized := old.is_personalized;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_workspace_mode on public.user_settings;
create trigger guard_workspace_mode
  before insert or update on public.user_settings
  for each row execute function public.guard_workspace_mode();

revoke all on function public.guard_workspace_mode() from public, anon, authenticated;

-- Marks the account as the owner when (and only when) its email is the owner
-- email AND that email is confirmed (Google sign-in or a clicked confirmation
-- link). Runs on signup and whenever email / confirmation changes.
create or replace function public.pin_owner_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_owner_email(new.email) and new.email_confirmed_at is not null then
    perform set_config('app.owner_pin', 'on', true);
    insert into public.user_settings (user_id, onboarding_completed, is_personalized, is_owner)
    values (new.id, true, true, true)
    on conflict (user_id) do update
      set is_owner = true,
          is_personalized = true,
          onboarding_completed = true;
    perform set_config('app.owner_pin', 'off', true);
  end if;
  return new;
end;
$$;

drop trigger if exists pin_owner_account on auth.users;
create trigger pin_owner_account
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.pin_owner_account();

revoke all on function public.pin_owner_account() from public, anon, authenticated;

-- New non-owner accounts: shared workspace, onboarding required. (Owner rows
-- are upgraded by pin_owner_account, which fires after this trigger's insert.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id, onboarding_completed, is_personalized, is_owner)
  values (new.id, false, false, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Onboarding completion selects the shared workspace, except for the owner.
create or replace function public.sync_onboarding_completion_to_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.completed_at is not null then
    if TG_OP = 'INSERT' or old.completed_at is null or old.completed_at <> new.completed_at then
      perform set_config('app.owner_pin', 'on', true);
      update public.user_settings
      set onboarding_completed = true,
          onboarding_completed_at = new.completed_at,
          is_personalized = is_owner
      where user_id = new.user_id;
      perform set_config('app.owner_pin', 'off', true);
    end if;
  end if;
  return new;
end;
$$;

-- Backfill: pin the existing owner account now.
do $$
begin
  perform set_config('app.owner_pin', 'on', true);
  update public.user_settings s
  set is_owner = true, is_personalized = true, onboarding_completed = true
  from auth.users u
  where u.id = s.user_id
    and public.is_owner_email(u.email)
    and u.email_confirmed_at is not null;

  -- Everyone else is shared. Legacy rows that still carry is_personalized = true
  -- (the old default) are demoted; their data is untouched.
  update public.user_settings
  set is_personalized = false
  where is_owner = false and is_personalized = true;
  perform set_config('app.owner_pin', 'off', true);
end;
$$;

comment on column public.user_settings.is_owner is
  'Set only by pin_owner_account() for the verified owner email; client sessions cannot change it.';
