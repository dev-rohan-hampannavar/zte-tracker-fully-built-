-- Prevent an authenticated user from granting themselves administrator
-- privileges through the otherwise owner-writable user_settings row.
-- Trusted service-role operations may provision/demote admins. Existing
-- admins may also demote themselves, but non-admin accounts cannot change
-- the flag from false to true.

create or replace function public.prevent_self_admin_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and not coalesce(old.is_admin, false)
     and auth.role() <> 'service_role' then
    raise exception 'Only a trusted administrator may grant administrator access'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_self_admin_promotion on public.user_settings;
create trigger prevent_self_admin_promotion
  before update of is_admin on public.user_settings
  for each row
  execute function public.prevent_self_admin_promotion();

revoke all on function public.prevent_self_admin_promotion() from public, anon, authenticated;

comment on function public.prevent_self_admin_promotion() is
  'Blocks client-side self-promotion through user_settings.is_admin. '
  'Trusted service-role provisioning can set the flag; current admins can demote themselves.';
