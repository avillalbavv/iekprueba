-- Eliminación segura de revisiones del horario, reservada al superadministrador.
grant delete on public.schedule_revisions to authenticated;

drop policy if exists schedule_revisions_superadmin_delete on public.schedule_revisions;
create policy schedule_revisions_superadmin_delete on public.schedule_revisions
  for delete to authenticated
  using (public.has_admin_permission('superadmin'));

create or replace function public.delete_schedule_revision(p_revision_id uuid)
returns table(file_path text, was_active boolean, restored_revision integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.schedule_revisions%rowtype;
  replacement public.schedule_revisions%rowtype;
begin
  if public.current_app_role() <> 'superadmin' then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  select * into target
  from public.schedule_revisions
  where id = p_revision_id
  for update;

  if not found then
    raise exception 'Schedule revision not found' using errcode = 'P0002';
  end if;

  if target.is_active then
    select * into replacement
    from public.schedule_revisions
    where id <> target.id
      and sections is not null
      and section_count > 0
    order by revision desc
    limit 1
    for update;

    if found then
      update public.schedule_revisions
      set is_active = true
      where id = replacement.id;
    end if;
  end if;

  delete from public.schedule_revisions where id = target.id;

  return query select
    target.file_path,
    target.is_active,
    case when replacement.id is null then null else replacement.revision end;
end;
$$;

revoke execute on function public.delete_schedule_revision(uuid) from public, anon;
grant execute on function public.delete_schedule_revision(uuid) to authenticated;

notify pgrst, 'reload schema';
