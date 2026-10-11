-- Private bucket for breakdown and repair photos, stored as `<ticket_id>/<file>`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-photos', 'ticket-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

create function private.can_see_ticket_path(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return private.can_see_ticket(split_part(p_name, '/', 1)::uuid);
exception when invalid_text_representation then
  return false;
end $$;

revoke execute on function private.can_see_ticket_path(text) from public, anon;
grant execute on function private.can_see_ticket_path(text) to authenticated;

create policy ticket_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'ticket-photos' and private.can_see_ticket_path(name));

create policy ticket_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-photos' and private.can_see_ticket_path(name));
