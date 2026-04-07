create table if not exists public.audit_questions (
  id uuid primary key default gen_random_uuid(),
  question_code text not null unique,
  question_text text not null,
  order_index integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint audit_questions_order_positive check (order_index > 0)
);

create unique index if not exists idx_audit_questions_order_index_unique
  on public.audit_questions (order_index);

create index if not exists idx_audit_questions_active_order
  on public.audit_questions (is_active, order_index);

create table if not exists public.audit_sessions (
  id uuid primary key default gen_random_uuid(),
  client_submission_id uuid not null unique,
  property_id uuid not null references public.properties(id) on delete restrict,
  auditor_id uuid not null references public.users(id) on delete restrict,
  created_by uuid references public.users(id) on delete set null,
  scheduled_for date not null,
  status text not null default 'PROGRAMADA',
  started_at timestamptz,
  submitted_at timestamptz,
  audit_payload jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint audit_sessions_status_check check (
    status in ('PROGRAMADA', 'EN_PROGRESO', 'ENVIADA', 'SINCRONIZADA', 'CANCELADA')
  ),
  constraint audit_sessions_summary_object_check
    check (jsonb_typeof(summary) = 'object')
);

create index if not exists idx_audit_sessions_property_scheduled
  on public.audit_sessions (property_id, scheduled_for desc);

create index if not exists idx_audit_sessions_auditor_scheduled
  on public.audit_sessions (auditor_id, scheduled_for desc);

create index if not exists idx_audit_sessions_status_scheduled
  on public.audit_sessions (status, scheduled_for desc);

create index if not exists idx_audit_sessions_payload_gin
  on public.audit_sessions using gin (audit_payload);

create unique index if not exists idx_audit_sessions_open_scope_unique
  on public.audit_sessions (property_id, auditor_id, scheduled_for)
  where status in ('PROGRAMADA', 'EN_PROGRESO', 'ENVIADA');

create or replace function public.validate_audit_payload(p_payload jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  answer_item jsonb;
  answer_status text;
  answer_comment text;
  answer_photos jsonb;
begin
  if p_payload is null then
    return true;
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    return false;
  end if;

  if not (p_payload ? 'answers') then
    return false;
  end if;

  if jsonb_typeof(p_payload -> 'answers') <> 'array' then
    return false;
  end if;

  for answer_item in
    select value from jsonb_array_elements(p_payload -> 'answers')
  loop
    if jsonb_typeof(answer_item) <> 'object' then
      return false;
    end if;

    if not (answer_item ? 'question_id' and answer_item ? 'status') then
      return false;
    end if;

    answer_status := answer_item ->> 'status';
    if answer_status not in ('OK', 'OBS') then
      return false;
    end if;

    if answer_status = 'OBS' then
      answer_comment := nullif(trim(coalesce(answer_item ->> 'comment', '')), '');
      if answer_comment is null then
        return false;
      end if;

      answer_photos := answer_item -> 'photos';
      if answer_photos is null
        or jsonb_typeof(answer_photos) <> 'array'
        or jsonb_array_length(answer_photos) = 0 then
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

alter table public.audit_sessions
  drop constraint if exists audit_sessions_payload_valid_check;

alter table public.audit_sessions
  add constraint audit_sessions_payload_valid_check
  check (public.validate_audit_payload(audit_payload));

create or replace function public.is_supervisor_or_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('SUPERVISOR', 'SUPERADMIN')
  );
$$;

create or replace function public.is_auditor_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.role = 'AUDITOR'::public.roleenum
  );
$$;

create or replace function public.has_audit_property_assignment(
  p_property_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_properties up
    where up.user_id = p_user_id
      and up.property_id = p_property_id
      and (up.expires_at is null or up.expires_at > now())
      and (
        up.property_role is null
        or up.property_role in ('AUDITOR'::public.roleenum, 'SUPERVISOR'::public.roleenum, 'SUPERADMIN'::public.roleenum)
      )
  );
$$;

create or replace function public.can_access_audit_session(
  p_property_id uuid,
  p_auditor_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.is_supervisor_or_admin_user() then
    return true;
  end if;

  if auth.uid() <> p_auditor_id then
    return false;
  end if;

  if not public.is_auditor_user(auth.uid()) then
    return false;
  end if;

  return public.has_audit_property_assignment(p_property_id, auth.uid());
end;
$$;

create or replace function public.assign_auditor_to_property(
  p_auditor_id uuid,
  p_property_id uuid,
  p_assignment_reason text default null,
  p_expires_at timestamptz default null
)
returns public.user_properties
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_row public.user_properties;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not public.is_supervisor_or_admin_user() then
    raise exception 'No tiene permisos para asignar auditores';
  end if;

  if not public.is_auditor_user(p_auditor_id) then
    raise exception 'El usuario destino no tiene rol AUDITOR';
  end if;

  insert into public.user_properties (
    user_id,
    property_id,
    assigned_by,
    assignment_reason,
    expires_at,
    property_role,
    assigned_at,
    created_at,
    updated_at
  ) values (
    p_auditor_id,
    p_property_id,
    auth.uid(),
    p_assignment_reason,
    p_expires_at,
    'AUDITOR'::public.roleenum,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id, property_id)
  do update set
    assigned_by = excluded.assigned_by,
    assignment_reason = excluded.assignment_reason,
    expires_at = excluded.expires_at,
    property_role = 'AUDITOR'::public.roleenum,
    assigned_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning * into assigned_row;

  return assigned_row;
end;
$$;

grant execute on function public.is_supervisor_or_admin_user() to authenticated;
grant execute on function public.is_auditor_user(uuid) to authenticated;
grant execute on function public.has_audit_property_assignment(uuid, uuid) to authenticated;
grant execute on function public.can_access_audit_session(uuid, uuid) to authenticated;
grant execute on function public.assign_auditor_to_property(uuid, uuid, text, timestamptz) to authenticated;

alter table public.audit_questions enable row level security;
alter table public.audit_sessions enable row level security;

drop policy if exists audit_questions_select on public.audit_questions;
create policy audit_questions_select
on public.audit_questions
for select
to authenticated
using (is_active = true);

drop policy if exists audit_questions_admin_write on public.audit_questions;
create policy audit_questions_admin_write
on public.audit_questions
for all
to authenticated
using (public.is_supervisor_or_admin_user())
with check (public.is_supervisor_or_admin_user());

drop policy if exists audit_sessions_select on public.audit_sessions;
create policy audit_sessions_select
on public.audit_sessions
for select
to authenticated
using (public.can_access_audit_session(property_id, auditor_id));

drop policy if exists audit_sessions_insert on public.audit_sessions;
create policy audit_sessions_insert
on public.audit_sessions
for insert
to authenticated
with check (public.can_access_audit_session(property_id, auditor_id));

drop policy if exists audit_sessions_update on public.audit_sessions;
create policy audit_sessions_update
on public.audit_sessions
for update
to authenticated
using (
  public.can_access_audit_session(property_id, auditor_id)
  and status <> 'SINCRONIZADA'
)
with check (
  public.can_access_audit_session(property_id, auditor_id)
  and status <> 'SINCRONIZADA'
);

drop policy if exists audit_sessions_delete on public.audit_sessions;
create policy audit_sessions_delete
on public.audit_sessions
for delete
to authenticated
using (public.is_supervisor_or_admin_user());

create or replace function public.touch_audit_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_audit_questions_updated_at on public.audit_questions;
create trigger trg_touch_audit_questions_updated_at
before update on public.audit_questions
for each row
execute function public.touch_audit_updated_at();

drop trigger if exists trg_touch_audit_sessions_updated_at on public.audit_sessions;
create trigger trg_touch_audit_sessions_updated_at
before update on public.audit_sessions
for each row
execute function public.touch_audit_updated_at();
