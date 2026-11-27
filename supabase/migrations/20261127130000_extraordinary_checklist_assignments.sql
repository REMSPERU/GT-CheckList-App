begin;

create table public.extraordinary_checklist_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.equipos(id),
  technician_id uuid not null references public.users(id),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index extraordinary_checklist_technician_idx
on public.extraordinary_checklist_assignments (technician_id, end_date);

alter table public.extraordinary_checklist_assignments enable row level security;
grant select on public.extraordinary_checklist_assignments to authenticated;

create policy extraordinary_checklist_read on public.extraordinary_checklist_assignments
for select to authenticated using (
  public.get_user_role() = 'SUPERADMIN'
  or (public.get_user_role() = 'TECNICO' and technician_id = (select auth.uid())
    and exists (
      select 1 from public.equipos e
      where e.id = asset_id and e.estatus is distinct from 'INACTIVO'
        and public.can_read_property(e.id_property)
    ))
);

create function public.assign_extraordinary_checklist(
  p_asset_id uuid, p_technician_id uuid, p_reason text, p_start_date date, p_end_date date
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  property_id uuid;
  assignment_id uuid;
begin
  if public.get_user_role() is distinct from 'SUPERADMIN' then
    raise exception 'Se requiere un Superadmin' using errcode = '42501';
  end if;

  select e.id_property into property_id from public.equipos e
  join public.properties p on p.id = e.id_property and p.is_active
  where e.id = p_asset_id and e.estatus is distinct from 'INACTIVO'
    and e.id_equipamento is not null;

  if property_id is null or not exists (
    select 1 from public.users u where u.id = p_technician_id and u.is_active
      and u.role = 'TECNICO' and public.can_read_property(property_id, u.id)
  ) then
    raise exception 'Selecciona un activo vigente y un Técnico asignado a su inmueble'
      using errcode = '23514';
  end if;

  if p_start_date < (now() at time zone 'America/Lima')::date then
    raise exception 'La inspección debe empezar hoy o después' using errcode = '23514';
  end if;

  insert into public.extraordinary_checklist_assignments
    (asset_id, technician_id, reason, start_date, end_date, created_by)
  values (p_asset_id, p_technician_id, btrim(p_reason), p_start_date, p_end_date, (select auth.uid()))
  returning id into assignment_id;
  return assignment_id;
end;
$$;

revoke execute on function public.assign_extraordinary_checklist(uuid, uuid, text, date, date)
from public, anon;
grant execute on function public.assign_extraordinary_checklist(uuid, uuid, text, date, date)
to authenticated;

create index if not exists equipos_codigo_lower_idx on public.equipos (lower(codigo));

create function public.find_extraordinary_checklist_asset(p_code text)
returns table (id uuid, codigo text, id_property uuid, property_name text)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.codigo, e.id_property, p.name
  from public.equipos e
  join public.properties p on p.id = e.id_property and p.is_active
  where (select public.get_user_role()) = 'SUPERADMIN'
    and lower(e.codigo) = lower(btrim(p_code))
    and e.estatus is distinct from 'INACTIVO'
    and e.id_equipamento is not null
  order by p.name, e.id
$$;

revoke execute on function public.find_extraordinary_checklist_asset(text) from public, anon;
grant execute on function public.find_extraordinary_checklist_asset(text) to authenticated;

alter table public.checklist_response
  add column extraordinary_assignment_id uuid unique
    references public.extraordinary_checklist_assignments(id),
  add constraint checklist_response_extraordinary_type check (
    (extraordinary_assignment_id is not null) = (frequency = 'EXTRAORDINARIA')
    and (extraordinary_assignment_id is null or checklist_schedule_id is null)
  );

drop trigger trg_guard_technician_checklist_schedule on public.checklist_response;
create trigger trg_guard_technician_checklist_schedule
before insert on public.checklist_response
for each row when (new.extraordinary_assignment_id is null)
execute function public.guard_technician_checklist_schedule();

create function public.guard_extraordinary_checklist()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  assignment public.extraordinary_checklist_assignments%rowtype;
begin
  if public.get_user_role() is distinct from 'TECNICO'
    or new.user_created is distinct from (select auth.uid()) then
    raise exception 'Solo el Técnico asignado puede realizar la inspección'
      using errcode = '42501';
  end if;

  select a.* into assignment
  from public.extraordinary_checklist_assignments a
  join public.equipos e on e.id = a.asset_id
  join public.properties p on p.id = e.id_property and p.is_active
  where a.id = new.extraordinary_assignment_id and a.technician_id = new.user_created
    and a.asset_id = new.equipo_id and e.id_equipamento = new.equipamento_id
    and e.estatus is distinct from 'INACTIVO' and public.can_read_property(e.id_property);

  if not found then
    raise exception 'La inspección no corresponde al Técnico o al activo'
      using errcode = '42501';
  end if;
  if new.submitted_at < assignment.created_at
    or new.submitted_at > now() + interval '5 minutes'
    or (new.submitted_at at time zone 'America/Lima')::date not between assignment.start_date and assignment.end_date
    or new.period_start <> assignment.start_date or new.period_end <> assignment.end_date then
    raise exception 'La respuesta está fuera de las fechas asignadas' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_extraordinary_checklist() from public, anon, authenticated;
create trigger trg_guard_extraordinary_checklist
before insert on public.checklist_response
for each row when (new.extraordinary_assignment_id is not null)
execute function public.guard_extraordinary_checklist();

alter policy gema_checklist_response_submit on public.checklist_response with check (
  user_created = (select auth.uid())
  and public.get_user_role() in ('TECNICO', 'AUDITOR', 'SUPERADMIN')
  and exists (
    select 1 from public.equipos e
    where e.id = checklist_response.equipo_id and e.id_equipamento = checklist_response.equipamento_id
      and (public.get_user_role() <> 'TECNICO'
        or checklist_response.extraordinary_assignment_id is not null
        or exists (
          select 1 from public.checklist_schedules cs
          where cs.id = checklist_response.checklist_schedule_id
            and cs.property_id = e.id_property and cs.equipamento_id = e.id_equipamento
        ))
  )
);

create function public.list_open_extraordinary_checklists()
returns table (id uuid, asset_id uuid, start_date date, end_date date, reason text)
language sql stable security invoker set search_path = ''
as $$
  select a.id, a.asset_id, a.start_date, a.end_date, a.reason
  from public.extraordinary_checklist_assignments a
  where a.technician_id = (select auth.uid())
    and a.end_date >= (now() at time zone 'America/Lima')::date
    and not exists (
      select 1 from public.checklist_response r where r.extraordinary_assignment_id = a.id
    )
$$;
revoke execute on function public.list_open_extraordinary_checklists() from public, anon;
grant execute on function public.list_open_extraordinary_checklists() to authenticated;

-- Las inspecciones extraordinarias no consumen las ocurrencias de la regla regular.
create or replace function public.validate_checklist_schedule(
  p_property_id uuid,
  p_equipamento_id uuid,
  p_submitted_at timestamptz default timezone('utc', now()),
  p_equipo_id uuid default null
)
returns table (
  has_schedule boolean,
  allowed boolean,
  reason text,
  schedule_id uuid,
  frequency text,
  occurrences_per_day integer,
  window_start time,
  window_end time,
  current_count integer,
  period_start date,
  period_end date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.checklist_schedules%rowtype;
  v_tz text;
  v_local_ts timestamp;
  v_local_date date;
  v_local_time time;
  v_anchor_date date;
  v_period_start_utc timestamptz;
  v_period_end_utc timestamptz;
  v_current_count integer := 0;
  v_days_from_anchor integer;
  v_is_frequency_day boolean := true;
  v_effective_start_date date;
  v_effective_end_date date;
  v_day_of_week integer;
  v_is_allowed_day boolean := true;
begin
  if p_property_id is null or p_equipamento_id is null then
    return query
    select false, true, null::text, null::uuid, null::text,
      null::integer, null::time, null::time, 0, null::date, null::date;
    return;
  end if;

  select *
  into v_schedule
  from public.checklist_schedules cs
  where cs.property_id = p_property_id
    and cs.equipamento_id = p_equipamento_id
    and cs.is_active = true
  limit 1;

  if not found then
    return query
    select false, true, null::text, null::uuid, null::text,
      null::integer, null::time, null::time, 0, null::date, null::date;
    return;
  end if;

  v_tz := coalesce(nullif(v_schedule.timezone, ''), 'America/Lima');
  v_local_ts := p_submitted_at at time zone v_tz;
  v_local_date := v_local_ts::date;
  v_local_time := v_local_ts::time;
  v_anchor_date := v_schedule.start_date;
  v_day_of_week := extract(isodow from v_local_date)::integer;

  -- 1. Check global exception calendar first
  perform 1
  from public.checklist_workday_exceptions cwe
  where cwe.exception_date = v_local_date
    and cwe.is_working_day = false;

  if found then
    return query
    select true, false,
      'Hoy es un dia no laborable segun el calendario de checklist.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      null::date, null::date;
    return;
  end if;

  -- 2. Check working days: use schedule-specific work_days if defined, otherwise fallback to global config
  if v_schedule.work_days is not null then
    v_is_allowed_day := v_day_of_week = any(v_schedule.work_days);
  else
    v_is_allowed_day := public.is_checklist_working_day(v_local_date);
  end if;

  if not v_is_allowed_day then
    return query
    select true, false,
      'Hoy es un dia no laborable segun el calendario de checklist.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      null::date, null::date;
    return;
  end if;

  if v_local_date < v_anchor_date then
    return query
    select true, false, 'La programacion aun no inicia.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0, null::date, null::date;
    return;
  end if;

  if v_schedule.end_date is not null and v_local_date > v_schedule.end_date then
    return query
    select true, false, 'La programacion ya vencio.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0, null::date, null::date;
    return;
  end if;

  if not (
    v_local_time >= v_schedule.window_start
    and v_local_time <= v_schedule.window_end
  ) then
    return query
    select true, false, 'El checklist esta fuera del rango horario permitido.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0, null::date, null::date;
    return;
  end if;

  v_days_from_anchor := v_local_date - v_anchor_date;

  if v_schedule.frequency = 'DIARIA' then
    v_effective_start_date := v_local_date;
    v_effective_end_date := v_local_date;
  elsif v_schedule.frequency = 'INTERDIARIA' then
    v_is_frequency_day := mod(v_days_from_anchor, 2)
      < v_schedule.execution_range_days;
    v_effective_start_date := v_anchor_date
      + (floor(v_days_from_anchor / 2.0)::integer * 2);
    v_effective_end_date := v_effective_start_date
      + v_schedule.execution_range_days - 1;
  elsif v_schedule.frequency = 'SEMANAL' then
    v_is_frequency_day := mod(v_days_from_anchor, 7)
      < v_schedule.execution_range_days;
    v_effective_start_date := v_anchor_date
      + (floor(v_days_from_anchor / 7.0)::integer * 7);
    v_effective_end_date := v_effective_start_date
      + v_schedule.execution_range_days - 1;
  elsif v_schedule.frequency = 'QUINCENAL' then
    v_is_frequency_day := mod(v_days_from_anchor, 15)
      < v_schedule.execution_range_days;
    v_effective_start_date := v_anchor_date
      + (floor(v_days_from_anchor / 15.0)::integer * 15);
    v_effective_end_date := v_effective_start_date
      + v_schedule.execution_range_days - 1;
  elsif v_schedule.frequency = 'MENSUAL' then
    select targets.target_date,
      targets.target_date + v_schedule.execution_range_days - 1
    into v_effective_start_date, v_effective_end_date
    from (
      values
        (public.get_checklist_target_date_for_month(v_anchor_date, (v_local_date - interval '1 month')::date)),
        (public.get_checklist_target_date_for_month(v_anchor_date, v_local_date)),
        (public.get_checklist_target_date_for_month(v_anchor_date, (v_local_date + interval '1 month')::date))
    ) as targets(target_date)
    where targets.target_date >= v_anchor_date
      and v_local_date between targets.target_date
        and (targets.target_date + v_schedule.execution_range_days - 1)
    order by targets.target_date desc
    limit 1;

    v_is_frequency_day := v_effective_start_date is not null;
  end if;

  if not v_is_frequency_day then
    return query
    select true, false,
      'Hoy no corresponde por frecuencia o rango de ejecucion.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      null::date, null::date;
    return;
  end if;

  v_period_start_utc := v_effective_start_date::timestamp at time zone v_tz;
  v_period_end_utc := (v_effective_end_date + 1)::timestamp at time zone v_tz;

  if p_equipo_id is not null then
    select count(*)::integer
    into v_current_count
    from public.checklist_response cr
    where cr.equipo_id = p_equipo_id
      and cr.extraordinary_assignment_id is null
      and cr.submitted_at >= v_period_start_utc
      and cr.submitted_at < v_period_end_utc;
  else
    select count(*)::integer
    into v_current_count
    from public.checklist_response cr
    join public.equipos e on e.id = cr.equipo_id
    where e.id_property = p_property_id
      and e.id_equipamento = p_equipamento_id
      and cr.extraordinary_assignment_id is null
      and cr.submitted_at >= v_period_start_utc
      and cr.submitted_at < v_period_end_utc;
  end if;

  if v_current_count >= v_schedule.occurrences_per_day then
    return query
    select true, false,
      'Se alcanzo el maximo de checklist permitidos para este rango.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, v_current_count,
      v_effective_start_date, v_effective_end_date;
    return;
  end if;

  return query
  select true, true, null::text, v_schedule.id, v_schedule.frequency,
    v_schedule.occurrences_per_day, v_schedule.window_start,
    v_schedule.window_end, v_current_count,
    v_effective_start_date, v_effective_end_date;
end;
$$;

commit;
