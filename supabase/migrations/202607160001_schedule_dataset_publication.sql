-- Publicación real y versionada de los datos procesados de horarios.
alter table public.schedule_revisions
  add column if not exists sections jsonb,
  add column if not exists section_count integer not null default 0,
  add column if not exists source_format text;

alter table public.schedule_revisions
  drop constraint if exists schedule_revisions_sections_array;
alter table public.schedule_revisions
  add constraint schedule_revisions_sections_array check (
    sections is null or (jsonb_typeof(sections) = 'array' and section_count > 0)
  );

-- El horario publicado no contiene datos privados. Anon solo puede leer las
-- columnas académicas necesarias y únicamente revisiones activas.
grant select (id, revision, change_summary, sections, section_count, published_at, is_active)
  on public.schedule_revisions to anon;

drop policy if exists schedule_revisions_public_dataset_read on public.schedule_revisions;
create policy schedule_revisions_public_dataset_read on public.schedule_revisions
  for select to anon
  using (is_active and sections is not null and section_count > 0);

create index if not exists schedule_revisions_active_revision_idx
  on public.schedule_revisions (revision desc)
  where is_active and sections is not null;

-- La auditoría conserva metadatos y conteos, no duplica cientos de KB del
-- conjunto de secciones en cada inserción o desactivación.
create or replace function public.audit_schedule_revision_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  row_id text;
begin
  row_id := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, '');
  insert into public.audit_log(actor_id, action, entity_type, entity_id, old_value, new_value, result)
  values(
    auth.uid(),
    'schedule_revisions.' || lower(tg_op),
    'schedule_revisions',
    row_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'sections' else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'sections' else null end,
    'success'
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists audit_schedule_revisions on public.schedule_revisions;
create trigger audit_schedule_revisions
after insert or update or delete on public.schedule_revisions
for each row execute function public.audit_schedule_revision_change();
