-- Formulario público de contacto con bandeja administrativa y protección básica anti-spam.
-- Migración aditiva: no modifica datos académicos ni cuentas existentes.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 5 and 120),
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_rate_idx
  on public.contact_messages (lower(email), created_at desc);

alter table public.contact_messages enable row level security;

revoke all on public.contact_messages from public, anon;
grant select on public.contact_messages to authenticated;

drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages
  for select to authenticated
  using (public.has_admin_permission('viewer'));

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_website text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  normalized_email text := lower(trim(p_email));
  new_id uuid;
begin
  if coalesce(trim(p_website), '') <> '' then
    raise exception 'No se pudo validar el envío';
  end if;
  if char_length(trim(p_name)) not between 2 and 80
    or char_length(normalized_email) not between 5 and 120
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(trim(p_subject)) not between 3 and 120
    or char_length(trim(p_message)) not between 10 and 1000 then
    raise exception 'Revisá los datos del formulario';
  end if;
  if (
    select count(*) from public.contact_messages
    where lower(email) = normalized_email and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'Alcanzaste el límite temporal de mensajes. Intentá nuevamente más tarde';
  end if;

  insert into public.contact_messages(user_id, name, email, subject, message)
  values (auth.uid(), trim(p_name), normalized_email, trim(p_subject), trim(p_message))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text)
  to anon, authenticated;

create or replace function public.update_contact_message_status(
  p_message_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
begin
  if not public.has_admin_permission('editor') then
    raise exception 'Permisos insuficientes';
  end if;
  if p_status not in ('read', 'archived') then
    raise exception 'Estado inválido';
  end if;
  update public.contact_messages
  set status = p_status, handled_by = auth.uid(), updated_at = now()
  where id = p_message_id;
end;
$$;

revoke all on function public.update_contact_message_status(uuid, text) from public, anon;
grant execute on function public.update_contact_message_status(uuid, text) to authenticated;
