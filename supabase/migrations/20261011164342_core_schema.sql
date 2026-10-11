-- Core schema: organisation (areas, machines, people) and breakdown tickets.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.user_role as enum ('area_leader', 'technician', 'manager');
create type public.ticket_status as enum (
  'new', 'assigned', 'in_progress', 'on_hold', 'resolved',
  'rejected', 'confirmed', 'closed', 'cancelled'
);
create type public.ticket_priority as enum ('critical', 'high', 'normal', 'low');
create type public.machine_criticality as enum ('A', 'B', 'C');

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Organisation -------------------------------------------------------------

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'area_leader',
  area_id uuid references public.areas (id) on delete set null,
  locale text not null default 'pl' check (locale in ('pl', 'en')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_area_id_idx on public.profiles (area_id);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id) on delete restrict,
  code text not null unique,
  name text not null,
  criticality public.machine_criticality not null default 'B',
  qr_token uuid not null unique default gen_random_uuid(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index machines_area_id_idx on public.machines (area_id);
create trigger machines_updated_at before update on public.machines
  for each row execute function private.set_updated_at();

-- Single-row plant settings.
create table public.app_settings (
  id boolean primary key default true check (id),
  allow_technician_self_assign boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function private.set_updated_at();

-- Profiles are created with the auth user. Role and area come from app_metadata,
-- which only the service role can set; user_metadata is user-editable and is used
-- for the display name only.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role, area_id, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'area_leader'),
    (new.raw_app_meta_data ->> 'area_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'locale', 'pl')
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Tickets ------------------------------------------------------------------

create sequence public.ticket_number_seq;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default (
    'UR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_number_seq')::text, 5, '0')
  ),
  machine_id uuid not null references public.machines (id) on delete restrict,
  area_id uuid not null references public.areas (id) on delete restrict,
  reported_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete set null,
  status public.ticket_status not null default 'new',
  priority public.ticket_priority not null default 'normal',
  title text not null check (char_length(title) between 3 and 200),
  description text check (char_length(description) <= 5000),
  machine_stopped boolean not null default false,
  root_cause text check (char_length(root_cause) <= 2000),
  resolution text check (char_length(resolution) <= 5000),
  -- Lifecycle timestamps feed the KPIs (MTTR, MTBF, downtime) in phase 2.
  reported_at timestamptz not null default now(),
  assigned_at timestamptz,
  started_at timestamptz,
  resolved_at timestamptz,
  confirmed_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);
create index tickets_area_status_idx on public.tickets (area_id, status);
create index tickets_assigned_status_idx on public.tickets (assigned_to, status);
create index tickets_status_reported_idx on public.tickets (status, reported_at desc);
create index tickets_machine_idx on public.tickets (machine_id, reported_at desc);
create index tickets_reported_by_idx on public.tickets (reported_by);
create trigger tickets_updated_at before update on public.tickets
  for each row execute function private.set_updated_at();

-- Time a technician spent on a ticket. Rows are opened and closed by
-- transition_ticket (entering/leaving in_progress); technicians may add a note.
create table public.ticket_work_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  technician_id uuid not null references public.profiles (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create index ticket_work_logs_ticket_idx on public.ticket_work_logs (ticket_id);
create index ticket_work_logs_technician_idx on public.ticket_work_logs (technician_id, started_at);
create unique index ticket_work_logs_one_open_idx on public.ticket_work_logs (ticket_id) where ended_at is null;

create table public.ticket_parts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  part_number text check (char_length(part_number) <= 100),
  name text not null check (char_length(name) between 1 and 200),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit text not null default 'pcs' check (char_length(unit) <= 20),
  added_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);
create index ticket_parts_ticket_idx on public.ticket_parts (ticket_id);
create index ticket_parts_added_by_idx on public.ticket_parts (added_by);

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index ticket_comments_ticket_idx on public.ticket_comments (ticket_id, created_at);
create index ticket_comments_author_idx on public.ticket_comments (author_id);

-- Photos live in the private `ticket-photos` bucket under `<ticket_id>/<file>`.
create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  storage_path text not null unique,
  kind text not null default 'report' check (kind in ('report', 'repair')),
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = ticket_id::text)
);
create index ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);
create index ticket_attachments_uploaded_by_idx on public.ticket_attachments (uploaded_by);

-- Append-only audit trail; written only by security-definer functions and triggers.
create table public.ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('created', 'status_changed', 'assigned', 'priority_changed')),
  from_status public.ticket_status,
  to_status public.ticket_status,
  comment text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index ticket_events_ticket_idx on public.ticket_events (ticket_id, created_at);
create index ticket_events_actor_idx on public.ticket_events (actor_id);

-- Access helpers -----------------------------------------------------------
-- Security definer so policies can call them without recursing into RLS.

create function private.current_user_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and active
$$;

create function private.current_user_area() returns uuid
language sql stable security definer set search_path = '' as $$
  select area_id from public.profiles where id = (select auth.uid()) and active
$$;

-- Who sees a ticket: managers everything, leaders their area,
-- technicians their own tickets plus the unassigned pool.
create function private.ticket_visible(
  p_area_id uuid, p_assigned_to uuid, p_status public.ticket_status
) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(case private.current_user_role()
    when 'manager' then true
    when 'area_leader' then p_area_id = private.current_user_area()
    when 'technician' then p_assigned_to = (select auth.uid()) or p_status = 'new'
    else false
  end, false)
$$;

create function private.can_see_ticket(p_ticket_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tickets t
    where t.id = p_ticket_id and private.ticket_visible(t.area_id, t.assigned_to, t.status)
  )
$$;

-- The ticket is open and the caller may work on it (assignee or manager).
create function private.can_work_on_ticket(p_ticket_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tickets t
    where t.id = p_ticket_id
      and t.status not in ('confirmed', 'closed', 'cancelled')
      and (
        private.current_user_role() = 'manager'
        or (private.current_user_role() = 'technician' and t.assigned_to = (select auth.uid()))
      )
  )
$$;
