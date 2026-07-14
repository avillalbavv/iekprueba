-- IEK Connect Hub: reparación definitiva de escritura administrativa.
-- Ejecutar después de 001, 002, 003 y 004. Es idempotente.

create or replace function public.current_app_role(target_user uuid default auth.uid())
returns public.app_role
language sql
stable
security definer
set search_path = public, auth, pg_catalog
as $$
  select coalesce(
    (select role from public.user_roles
      where user_id = target_user and is_active and revoked_at is null),
    'student'::public.app_role
  );
$$;

create or replace function public.has_admin_permission(minimum public.app_role)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  active_role public.app_role;
begin
  if auth.uid() is null then return false; end if;
  active_role := public.current_app_role(auth.uid());
  if minimum = 'viewer' then return active_role in ('viewer','editor','admin','superadmin'); end if;
  if minimum = 'editor' then return active_role in ('editor','admin','superadmin'); end if;
  if minimum = 'admin' then return active_role in ('admin','superadmin'); end if;
  return active_role = 'superadmin';
end;
$$;

revoke execute on function public.current_app_role(uuid) from public, anon;
revoke execute on function public.has_admin_permission(public.app_role) from public, anon;
grant execute on function public.current_app_role(uuid) to authenticated;
grant execute on function public.has_admin_permission(public.app_role) to authenticated;

grant select, insert, update, delete on public.admin_notices,
  public.academic_events, public.exam_schedules, public.academic_resources to authenticated;
grant select, insert, update on public.schedule_revisions to authenticated;
grant usage, select on sequence public.schedule_revisions_revision_seq to authenticated;

alter table public.admin_notices enable row level security;
alter table public.academic_events enable row level security;
alter table public.exam_schedules enable row level security;
alter table public.academic_resources enable row level security;
alter table public.schedule_revisions enable row level security;

-- Avisos
drop policy if exists notices_editor_write on public.admin_notices;
drop policy if exists notices_editor_insert on public.admin_notices;
drop policy if exists notices_editor_update on public.admin_notices;
drop policy if exists notices_admin_delete on public.admin_notices;
create policy notices_editor_insert on public.admin_notices
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.has_admin_permission('admin')
      or (public.has_admin_permission('editor') and status in ('draft','review')))
  );
create policy notices_editor_update on public.admin_notices
  for update to authenticated
  using (public.has_admin_permission('editor'))
  with check (
    updated_by = auth.uid()
    and (public.has_admin_permission('admin')
      or (public.has_admin_permission('editor') and status in ('draft','review')))
  );
create policy notices_admin_delete on public.admin_notices
  for delete to authenticated using (public.has_admin_permission('admin'));

-- Calendario
drop policy if exists events_editor_write on public.academic_events;
drop policy if exists events_editor_insert on public.academic_events;
drop policy if exists events_editor_update on public.academic_events;
drop policy if exists events_admin_delete on public.academic_events;
create policy events_editor_insert on public.academic_events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.has_admin_permission('admin')
      or (public.has_admin_permission('editor') and status in ('draft','review')))
  );
create policy events_editor_update on public.academic_events
  for update to authenticated
  using (public.has_admin_permission('editor'))
  with check (
    updated_by = auth.uid()
    and (public.has_admin_permission('admin')
      or (public.has_admin_permission('editor') and status in ('draft','review')))
  );
create policy events_admin_delete on public.academic_events
  for delete to authenticated using (public.has_admin_permission('admin'));

-- Recursos
drop policy if exists resources_editor_write on public.academic_resources;
drop policy if exists resources_editor_insert on public.academic_resources;
drop policy if exists resources_editor_update on public.academic_resources;
drop policy if exists resources_admin_delete on public.academic_resources;
create policy resources_editor_insert on public.academic_resources
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.has_admin_permission('admin')
      or (public.has_admin_permission('editor') and status in ('draft','review')))
  );
create policy resources_editor_update on public.academic_resources
  for update to authenticated
  using (public.has_admin_permission('editor'))
  with check (
    updated_by = auth.uid()
    and (public.has_admin_permission('admin')
      or (public.has_admin_permission('editor') and status in ('draft','review')))
  );
create policy resources_admin_delete on public.academic_resources
  for delete to authenticated using (public.has_admin_permission('admin'));

-- Exámenes
drop policy if exists exams_admin_write on public.exam_schedules;
drop policy if exists exams_admin_insert on public.exam_schedules;
drop policy if exists exams_admin_update on public.exam_schedules;
drop policy if exists exams_admin_delete on public.exam_schedules;
create policy exams_admin_insert on public.exam_schedules
  for insert to authenticated
  with check (created_by = auth.uid() and public.has_admin_permission('admin'));
create policy exams_admin_update on public.exam_schedules
  for update to authenticated
  using (public.has_admin_permission('admin'))
  with check (updated_by = auth.uid() and public.has_admin_permission('admin'));
create policy exams_admin_delete on public.exam_schedules
  for delete to authenticated using (public.has_admin_permission('admin'));

-- Versiones de horarios
drop policy if exists schedule_revisions_admin_insert on public.schedule_revisions;
drop policy if exists schedule_revisions_admin_update on public.schedule_revisions;
create policy schedule_revisions_admin_insert on public.schedule_revisions
  for insert to authenticated
  with check (published_by = auth.uid() and public.has_admin_permission('admin'));
create policy schedule_revisions_admin_update on public.schedule_revisions
  for update to authenticated
  using (public.has_admin_permission('admin'))
  with check (public.has_admin_permission('admin'));

-- Storage para Excel/CSV
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'schedule-imports', 'schedule-imports', false, 10485760,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel', 'text/csv', 'application/csv',
    'text/plain', 'application/octet-stream'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists schedule_files_admin_insert on storage.objects;
drop policy if exists schedule_files_admin_read on storage.objects;
drop policy if exists schedule_files_admin_delete on storage.objects;
create policy schedule_files_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'schedule-imports' and public.has_admin_permission('admin'));
create policy schedule_files_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'schedule-imports' and public.has_admin_permission('admin'));
create policy schedule_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'schedule-imports' and public.has_admin_permission('admin'));
