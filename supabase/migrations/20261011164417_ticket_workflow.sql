-- Ticket workflow. All status and assignment changes go through these
-- security-definer functions; clients cannot write those columns directly.
-- Errors are raised with stable message keys that the UI translates.

-- Mirrors TRANSITIONS in src/lib/tickets/status.ts (a unit test keeps them in sync).
create table private.ticket_transitions (
  from_status public.ticket_status not null,
  to_status public.ticket_status not null,
  role public.user_role not null,
  primary key (from_status, to_status, role)
);

insert into private.ticket_transitions (from_status, to_status, role) values
  ('new', 'assigned', 'manager'),
  ('new', 'assigned', 'technician'),
  ('new', 'cancelled', 'manager'),
  ('assigned', 'in_progress', 'technician'),
  ('assigned', 'cancelled', 'manager'),
  ('in_progress', 'on_hold', 'technician'),
  ('in_progress', 'resolved', 'technician'),
  ('on_hold', 'in_progress', 'technician'),
  ('resolved', 'confirmed', 'area_leader'),
  ('resolved', 'rejected', 'area_leader'),
  ('rejected', 'in_progress', 'technician'),
  ('confirmed', 'closed', 'manager');

-- Report a breakdown --------------------------------------------------------

create function public.create_ticket(
  p_machine_id uuid,
  p_title text,
  p_description text default null,
  p_priority public.ticket_priority default 'normal',
  p_machine_stopped boolean default false
) returns public.tickets
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := private.current_user_role();
  v_area uuid;
  v_ticket public.tickets;
begin
  if v_role is null or v_role not in ('area_leader', 'manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select area_id into v_area from public.machines where id = p_machine_id and active;
  if v_area is null then
    raise exception 'machine_not_found' using errcode = 'P0002';
  end if;
  if v_role = 'area_leader' and v_area is distinct from private.current_user_area() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.tickets (machine_id, area_id, reported_by, title, description, priority, machine_stopped)
  values (
    p_machine_id, v_area, auth.uid(), trim(p_title),
    nullif(trim(p_description), ''), p_priority, p_machine_stopped
  )
  returning * into v_ticket;

  insert into public.ticket_events (ticket_id, actor_id, event_type, to_status)
  values (v_ticket.id, auth.uid(), 'created', 'new');

  return v_ticket;
end $$;

-- Change status ---------------------------------------------------------------

create function public.transition_ticket(
  p_ticket_id uuid,
  p_to public.ticket_status,
  p_comment text default null
) returns public.tickets
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role := private.current_user_role();
  v_comment text := nullif(trim(p_comment), '');
  v_ticket public.tickets;
  v_from public.ticket_status;
begin
  if v_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found or not private.ticket_visible(v_ticket.area_id, v_ticket.assigned_to, v_ticket.status) then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
  v_from := v_ticket.status;

  if not exists (
    select 1 from private.ticket_transitions
    where from_status = v_from and to_status = p_to and role = v_role
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  if p_to = 'assigned' then
    -- Managers assign someone else via assign_ticket; this path is technician self-assignment.
    if v_role <> 'technician' then
      raise exception 'use_assign_ticket' using errcode = 'P0001';
    end if;
    if not (select allow_technician_self_assign from public.app_settings) then
      raise exception 'self_assign_disabled' using errcode = '42501';
    end if;
  elsif v_role = 'technician' and v_ticket.assigned_to is distinct from v_uid then
    raise exception 'not_assignee' using errcode = '42501';
  end if;

  if p_to in ('rejected', 'cancelled', 'on_hold') and v_comment is null then
    raise exception 'comment_required' using errcode = 'P0001';
  end if;
  if p_to = 'resolved' and nullif(trim(v_ticket.resolution), '') is null then
    raise exception 'resolution_required' using errcode = 'P0001';
  end if;

  -- Work time is tracked automatically while the ticket is in progress.
  if v_from = 'in_progress' then
    update public.ticket_work_logs set ended_at = now()
    where ticket_id = p_ticket_id and ended_at is null;
  end if;
  if p_to = 'in_progress' then
    insert into public.ticket_work_logs (ticket_id, technician_id) values (p_ticket_id, v_uid);
  end if;

  update public.tickets set
    status = p_to,
    assigned_to = case when p_to = 'assigned' then v_uid else assigned_to end,
    assigned_at = case when p_to = 'assigned' then now() else assigned_at end,
    started_at = case when p_to = 'in_progress' then coalesce(started_at, now()) else started_at end,
    resolved_at = case when p_to = 'resolved' then now() else resolved_at end,
    confirmed_at = case when p_to = 'confirmed' then now() else confirmed_at end,
    closed_at = case when p_to = 'closed' then now() else closed_at end,
    cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end
  where id = p_ticket_id
  returning * into v_ticket;

  insert into public.ticket_events (ticket_id, actor_id, event_type, from_status, to_status, comment)
  values (p_ticket_id, v_uid, 'status_changed', v_from, p_to, v_comment);

  return v_ticket;
end $$;

-- Assign or reassign (manager) ----------------------------------------------

create function public.assign_ticket(
  p_ticket_id uuid,
  p_technician_id uuid,
  p_comment text default null
) returns public.tickets
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ticket public.tickets;
  v_from public.ticket_status;
begin
  if private.current_user_role() is distinct from 'manager' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_technician_id and role = 'technician' and active
  ) then
    raise exception 'invalid_technician' using errcode = 'P0001';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
  -- Reassigning while someone is actively working would orphan their time log.
  if v_ticket.status not in ('new', 'assigned', 'on_hold', 'rejected') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  v_from := v_ticket.status;

  update public.tickets set
    assigned_to = p_technician_id,
    assigned_at = now(),
    status = case when status = 'new' then 'assigned'::public.ticket_status else status end
  where id = p_ticket_id
  returning * into v_ticket;

  insert into public.ticket_events (ticket_id, actor_id, event_type, from_status, to_status, comment, payload)
  values (
    p_ticket_id, v_uid, 'assigned', v_from, v_ticket.status, nullif(trim(p_comment), ''),
    jsonb_build_object('technician_id', p_technician_id)
  );

  return v_ticket;
end $$;

-- Direct edits ----------------------------------------------------------------
-- Clients may update a few descriptive columns (see grants in the access_control migration). Managers edit
-- priority and description; technicians only fill in root cause and resolution.
-- Functions above run as the owner, so this guard only applies to API callers.

create function private.guard_ticket_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if old.status in ('confirmed', 'closed', 'cancelled') then
    raise exception 'ticket_locked' using errcode = '42501';
  end if;

  if private.current_user_role() = 'technician'
    and (new.priority, new.title, new.description, new.machine_stopped)
      is distinct from (old.priority, old.title, old.description, old.machine_stopped)
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return new;
end $$;

create trigger tickets_guard_update before update on public.tickets
  for each row execute function private.guard_ticket_update();

create function private.log_priority_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ticket_events (ticket_id, actor_id, event_type, payload)
  values (
    new.id, auth.uid(), 'priority_changed',
    jsonb_build_object('from', old.priority, 'to', new.priority)
  );
  return new;
end $$;

create trigger tickets_log_priority after update of priority on public.tickets
  for each row when (old.priority is distinct from new.priority)
  execute function private.log_priority_change();
