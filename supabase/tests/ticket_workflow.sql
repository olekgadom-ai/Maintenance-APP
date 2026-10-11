-- Workflow and access-control test. Runs in a transaction and rolls back.
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ticket_workflow.sql
-- Any failed expectation raises an exception and aborts the script.

begin;
set local statement_timeout = '10s';

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.expect_error(p_sql text, p_message text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'no error';
exception when others then
  if sqlerrm not like p_message then
    raise exception 'expected error "%", got "%" for: %', p_message, sqlerrm, p_sql;
  end if;
end $$;

create function pg_temp.expect(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'expectation failed: %', p_what; end if;
end $$;

create function pg_temp.ticket() returns uuid language sql as $$
  select current_setting('test.ticket')::uuid
$$;

-- Fixtures: users get their role from app_metadata through the signup trigger.
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  u.email, jsonb_build_object('role', u.role, 'area_id', a.id), jsonb_build_object('full_name', u.email)
from (values
  ('00000000-0000-4000-8000-0000000000a1', 'leader.ml@test.local', 'area_leader', 'ML'),
  ('00000000-0000-4000-8000-0000000000a2', 'leader.wt@test.local', 'area_leader', 'WT'),
  ('00000000-0000-4000-8000-0000000000b1', 'tech1@test.local', 'technician', null),
  ('00000000-0000-4000-8000-0000000000b2', 'tech2@test.local', 'technician', null),
  ('00000000-0000-4000-8000-0000000000c1', 'manager@test.local', 'manager', null)
) as u(id, email, role, area_code)
left join public.areas a on a.code = u.area_code;

select pg_temp.expect(
  (select role from public.profiles where id = '00000000-0000-4000-8000-0000000000c1') = 'manager',
  'profile created with role from app_metadata');

-- Reporting -------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a1'); -- leader ML
select set_config('test.ticket', (public.create_ticket(
  (select id from public.machines where code = 'ML-01'), 'Robot stoi, błąd serwa', 'Alarm E-204', 'high', true
)).id::text, true);
select pg_temp.expect((select status = 'new' and number like 'UR-____-_____' and machine_stopped
  from public.tickets where id = pg_temp.ticket()), 'leader reports a ticket');
select pg_temp.expect_error(
  $$select public.create_ticket((select id from public.machines where code = 'WT-01'), 'Obcy obszar')$$,
  'forbidden');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b1'); -- tech1
select pg_temp.expect_error(
  $$select public.create_ticket((select id from public.machines where code = 'ML-01'), 'Technik zgłasza')$$,
  'forbidden');

-- Visibility ------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a2'); -- leader WT
select pg_temp.expect((select count(*) from public.tickets) = 0, 'other area leader sees nothing');
select pg_temp.act_as('00000000-0000-4000-8000-0000000000b1'); -- tech1
select pg_temp.expect((select count(*) from public.tickets) = 1, 'technician sees unassigned pool');

-- Assignment ------------------------------------------------------------------

select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'assigned')$$, pg_temp.ticket()), 'self_assign_disabled');
select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'in_progress')$$, pg_temp.ticket()), 'invalid_transition');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000c1'); -- manager
select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'assigned')$$, pg_temp.ticket()), 'use_assign_ticket');
select pg_temp.expect_error(
  format($$select public.assign_ticket(%L, '00000000-0000-4000-8000-0000000000a1')$$, pg_temp.ticket()),
  'invalid_technician');
select public.assign_ticket(pg_temp.ticket(), '00000000-0000-4000-8000-0000000000b1');
select pg_temp.expect((select status = 'assigned' and assigned_at is not null from public.tickets where id = pg_temp.ticket()),
  'manager assigns technician');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b2'); -- tech2
select pg_temp.expect((select count(*) from public.tickets) = 0, 'other technician no longer sees it');
select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'in_progress')$$, pg_temp.ticket()), 'ticket_not_found');

-- Work ------------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b1'); -- tech1
select public.transition_ticket(pg_temp.ticket(), 'in_progress');
select pg_temp.expect((select count(*) from public.ticket_work_logs where ended_at is null) = 1, 'work log opened');
select pg_temp.expect_error(format($$update public.tickets set priority = 'low' where id = %L$$, pg_temp.ticket()), 'forbidden');
select pg_temp.expect_error(format($$update public.tickets set status = 'closed' where id = %L$$, pg_temp.ticket()), 'permission denied%');
select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'on_hold')$$, pg_temp.ticket()), 'comment_required');
select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'resolved')$$, pg_temp.ticket()), 'resolution_required');

insert into public.ticket_parts (ticket_id, name, part_number, quantity) values (pg_temp.ticket(), 'Enkoder', 'SICK-123', 1);
update public.tickets set root_cause = 'Uszkodzony enkoder', resolution = 'Wymiana enkodera, kalibracja osi'
  where id = pg_temp.ticket();
select public.transition_ticket(pg_temp.ticket(), 'resolved', 'Gotowe');
select pg_temp.expect((select count(*) from public.ticket_work_logs where ended_at is null) = 0, 'work log closed on resolve');

-- Sign-off --------------------------------------------------------------------

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a1'); -- leader ML
select pg_temp.expect_error(
  format($$insert into public.ticket_parts (ticket_id, name) values (%L, 'x')$$, pg_temp.ticket()),
  'new row violates row-level security policy%');
select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'rejected')$$, pg_temp.ticket()), 'comment_required');
select public.transition_ticket(pg_temp.ticket(), 'rejected', 'Nadal pojawia się alarm');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000c1'); -- manager
select pg_temp.expect_error(format($$select public.transition_ticket(%L, 'confirmed')$$, pg_temp.ticket()), 'invalid_transition');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b1'); -- tech1
select public.transition_ticket(pg_temp.ticket(), 'in_progress');
select public.transition_ticket(pg_temp.ticket(), 'resolved');
select pg_temp.expect((select count(*) from public.ticket_work_logs where ticket_id = pg_temp.ticket()) = 2,
  'second work session recorded');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a1'); -- leader ML
select public.transition_ticket(pg_temp.ticket(), 'confirmed');
select pg_temp.act_as('00000000-0000-4000-8000-0000000000c1'); -- manager
select public.transition_ticket(pg_temp.ticket(), 'closed');
select pg_temp.expect((select status = 'closed' and resolved_at is not null and confirmed_at is not null
  and closed_at is not null and started_at is not null from public.tickets where id = pg_temp.ticket()),
  'ticket closed with full timeline');
select pg_temp.expect_error(format($$update public.tickets set title = 'Zmiana' where id = %L$$, pg_temp.ticket()), 'ticket_locked');
select pg_temp.expect((select array_agg(coalesce(to_status::text, event_type) order by id)
  from public.ticket_events where ticket_id = pg_temp.ticket())
  = array['new', 'assigned', 'in_progress', 'resolved', 'rejected', 'in_progress', 'resolved', 'confirmed', 'closed'],
  'audit trail is complete');

-- Settings and self-assignment ------------------------------------------------

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a1'); -- leader cannot change settings
update public.app_settings set allow_technician_self_assign = true where id;
select pg_temp.expect(not (select allow_technician_self_assign from public.app_settings), 'leader cannot change settings');
select set_config('test.ticket', (public.create_ticket(
  (select id from public.machines where code = 'ML-02'), 'Wyciek oleju')).id::text, true);

select pg_temp.act_as('00000000-0000-4000-8000-0000000000c1'); -- manager enables it
update public.app_settings set allow_technician_self_assign = true where id;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000b2'); -- tech2 takes from pool
select public.transition_ticket(pg_temp.ticket(), 'assigned');
select pg_temp.expect((select assigned_to = '00000000-0000-4000-8000-0000000000b2' from public.tickets
  where id = pg_temp.ticket()), 'technician self-assigns when allowed');

-- Anonymous access ------------------------------------------------------------

reset role;
select set_config('role', 'anon', true);
select pg_temp.expect_error('select count(*) from public.tickets', 'permission denied%');
select pg_temp.expect_error($$select public.create_ticket(gen_random_uuid(), 'x')$$, 'permission denied%');

reset role;
select 'ticket workflow: all checks passed' as result;

rollback;
