-- Route shared users from their own account settings, not from which
-- reusable curriculum track they happen to use.

-- Every new Auth user receives a separate shared-workspace profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id, onboarding_completed, is_personalized)
  values (new.id, false, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Repair accounts created while the signup trigger was missing. Existing
-- account settings and their personal experience remain untouched.
insert into public.user_settings (user_id, onboarding_completed, is_personalized)
select users.id, false, false
from auth.users as users
where not exists (
  select 1 from public.user_settings as settings where settings.user_id = users.id
)
on conflict (user_id) do nothing;

-- A completed onboarding response identifies an account that entered the
-- shared-user journey. Keep these accounts in shared mode on old deployments.
update public.user_settings as settings
set is_personalized = false,
    onboarding_completed = true,
    onboarding_completed_at = responses.completed_at
from public.onboarding_responses as responses
where responses.user_id = settings.user_id
  and responses.completed_at is not null;

-- Onboarding completion also selects the shared workspace. Existing owner
-- accounts that never complete shared onboarding retain their current mode.
create or replace function public.sync_onboarding_completion_to_user_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.completed_at is not null then
    if TG_OP = 'INSERT' or old.completed_at is null or old.completed_at <> new.completed_at then
      update public.user_settings
      set onboarding_completed = true,
          onboarding_completed_at = new.completed_at,
          is_personalized = false
      where user_id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

comment on column public.user_settings.is_personalized is
  'True selects the original private experience for existing owner accounts. '
  'New accounts start false and remain in the shared-user workspace after '
  'completing onboarding. Routing uses this account setting.';
