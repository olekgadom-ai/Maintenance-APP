-- Grants and row level security. Supabase grants everything to anon/authenticated
-- by default; start from nothing and open up only what the app needs.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Helpers are referenced from policies, which run as the caller.
grant execute on function
  private.current_user_role(),
  private.current_user_area(),
  private.ticket_visible(uuid, uuid, public.ticket_status),
  private.can_see_ticket(uuid),
  private.can_work_on_ticket(uuid)
to authenticated;

grant execute on function
  public.create_ticket(uuid, text, text, public.ticket_priority, boolean),
  public.transition_ticket(uuid, public.ticket_status, text),
  public.assign_ticket(uuid, uuid, text)
to authenticated;

alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.machines enable row level security;
alter table public.app_settings enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_work_logs enable row level security;
alter table public.ticket_parts enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_events enable row level security;

-- Organisation: readable by everyone signed in, maintained by managers.

grant select, insert, update, delete on public.areas to authenticated;
create policy areas_read on public.areas for select to authenticated using (true);
create policy areas_manage on public.areas for all to authenticated
  using ((select private.current_user_role()) = 'manager')
  with check ((select private.current_user_role()) = 'manager');

grant select, insert, update, delete on public.machines to authenticated;
create policy machines_read on public.machines for select to authenticated using (true);
create policy machines_manage on public.machines for all to authenticated
  using ((select private.current_user_role()) = 'manager')
  with check ((select private.current_user_role()) = 'manager');

-- Names and roles are needed across the app (reporter, assignee pickers).
-- Users edit their own name and language; role/area changes come in stage 8.
grant select on public.profiles to authenticated;
grant update (full_name, locale) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on public.app_settings to authenticated;
grant update (allow_technician_self_assign) on public.app_settings to authenticated;
create policy app_settings_read on public.app_settings for select to authenticated using (true);
create policy app_settings_manage on public.app_settings for update to authenticated
  using ((select private.current_user_role()) = 'manager')
  with check ((select private.current_user_role()) = 'manager');

-- Tickets: created and moved through the workflow by RPC only.

grant select on public.tickets to authenticated;
grant update (priority, title, description, machine_stopped, root_cause, resolution)
  on public.tickets to authenticated;
create policy tickets_read on public.tickets for select to authenticated
  using (private.ticket_visible(area_id, assigned_to, status));
create policy tickets_update on public.tickets for update to authenticated
  using (
    (select private.current_user_role()) = 'manager'
    or ((select private.current_user_role()) = 'technician' and assigned_to = (select auth.uid()))
  )
  with check (
    (select private.current_user_role()) = 'manager'
    or ((select private.current_user_role()) = 'technician' and assigned_to = (select auth.uid()))
  );

grant select on public.ticket_work_logs to authenticated;
grant update (note) on public.ticket_work_logs to authenticated;
create policy work_logs_read on public.ticket_work_logs for select to authenticated
  using (private.can_see_ticket(ticket_id));
create policy work_logs_update_own on public.ticket_work_logs for update to authenticated
  using (technician_id = (select auth.uid()))
  with check (technician_id = (select auth.uid()));

grant select, delete on public.ticket_parts to authenticated;
grant insert (ticket_id, part_number, name, quantity, unit) on public.ticket_parts to authenticated;
create policy parts_read on public.ticket_parts for select to authenticated
  using (private.can_see_ticket(ticket_id));
create policy parts_insert on public.ticket_parts for insert to authenticated
  with check (added_by = (select auth.uid()) and private.can_work_on_ticket(ticket_id));
create policy parts_delete_own on public.ticket_parts for delete to authenticated
  using (added_by = (select auth.uid()) and private.can_work_on_ticket(ticket_id));

grant select on public.ticket_comments to authenticated;
grant insert (ticket_id, body) on public.ticket_comments to authenticated;
create policy comments_read on public.ticket_comments for select to authenticated
  using (private.can_see_ticket(ticket_id));
create policy comments_insert on public.ticket_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and private.can_see_ticket(ticket_id));

grant select on public.ticket_attachments to authenticated;
grant insert (ticket_id, storage_path, kind) on public.ticket_attachments to authenticated;
create policy attachments_read on public.ticket_attachments for select to authenticated
  using (private.can_see_ticket(ticket_id));
create policy attachments_insert on public.ticket_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and private.can_see_ticket(ticket_id));

grant select on public.ticket_events to authenticated;
create policy events_read on public.ticket_events for select to authenticated
  using (private.can_see_ticket(ticket_id));

-- Live updates for the manager board and "my tickets" lists (RLS still applies).
alter publication supabase_realtime add table public.tickets, public.ticket_events;
