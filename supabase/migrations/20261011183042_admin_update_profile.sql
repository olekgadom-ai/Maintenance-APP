-- Managers maintain people: role, area and whether the account is active.
-- Profiles have no direct update grant for these columns, so this function is
-- the only way to change them.

create function public.admin_update_profile(
  p_user_id uuid,
  p_role public.user_role,
  p_area_id uuid,
  p_active boolean
) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  if private.current_user_role() is distinct from 'manager' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- A manager cannot lock themselves out or drop their own role.
  if p_user_id = auth.uid() and (p_role <> 'manager' or not p_active) then
    raise exception 'cannot_change_self' using errcode = 'P0001';
  end if;
  -- Area leaders report for one area; the others work across the plant.
  if p_role = 'area_leader' and p_area_id is null then
    raise exception 'area_required' using errcode = 'P0001';
  end if;

  update public.profiles
  set role = p_role,
      area_id = case when p_role = 'area_leader' then p_area_id else null end,
      active = p_active
  where id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  return v_profile;
end $$;

revoke execute on function public.admin_update_profile(uuid, public.user_role, uuid, boolean) from public, anon;
grant execute on function public.admin_update_profile(uuid, public.user_role, uuid, boolean) to authenticated;
