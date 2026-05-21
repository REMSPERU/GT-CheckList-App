drop function if exists public.validate_checklist_schedule(uuid, uuid, timestamptz, uuid);
drop function if exists public.validate_checklist_schedule(uuid, timestamptz);

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
  v_effective_start_date date;
  v_effective_end_date date;
  v_uses_configured_range boolean := false;
  v_period_start_utc timestamptz;
  v_period_end_utc timestamptz;
  v_current_count integer := 0;
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
  v_uses_configured_range := v_schedule.frequency in ('SEMANAL', 'MENSUAL')
    and v_schedule.start_date is not null
    and v_schedule.end_date is not null;

  if v_uses_configured_range then
    v_effective_start_date := v_schedule.start_date;
    v_effective_end_date := v_schedule.end_date;
  else
    v_effective_start_date := v_local_date;
    v_effective_end_date := v_local_date;
  end if;

  if v_uses_configured_range and v_local_date < v_effective_start_date then
    return query
    select true, false, 'La programacion aun no inicia.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      v_effective_start_date, v_effective_end_date;
    return;
  end if;

  if v_uses_configured_range and v_local_date > v_effective_end_date then
    return query
    select true, false, 'La programacion ya vencio.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      v_effective_start_date, v_effective_end_date;
    return;
  end if;

  if not (v_local_time >= v_schedule.window_start and v_local_time <= v_schedule.window_end) then
    return query
    select true, false, 'El checklist esta fuera del rango horario permitido.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      v_effective_start_date, v_effective_end_date;
    return;
  end if;

  v_period_start_utc := v_effective_start_date::timestamp at time zone v_tz;
  v_period_end_utc := (v_effective_end_date + 1)::timestamp at time zone v_tz;

  if p_equipo_id is not null then
    select count(*)::integer
    into v_current_count
    from public.checklist_response cr
    where cr.equipo_id = p_equipo_id
      and cr.submitted_at >= v_period_start_utc
      and cr.submitted_at < v_period_end_utc;
  else
    select count(*)::integer
    into v_current_count
    from public.checklist_response cr
    join public.equipos e on e.id = cr.equipo_id
    where e.id_property = p_property_id
      and e.id_equipamento = p_equipamento_id
      and cr.submitted_at >= v_period_start_utc
      and cr.submitted_at < v_period_end_utc;
  end if;

  if v_current_count >= v_schedule.occurrences_per_day then
    return query
    select true, false,
      case
        when v_uses_configured_range then 'Se alcanzo el maximo de checklist permitidos para este rango programado.'
        else 'Se alcanzo el maximo de checklist permitidos para hoy.'
      end,
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

create or replace function public.validate_checklist_schedule(
  p_equipo_id uuid,
  p_submitted_at timestamptz default timezone('utc', now())
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
  v_property_id uuid;
  v_equipamento_id uuid;
begin
  select e.id_property, e.id_equipamento
  into v_property_id, v_equipamento_id
  from public.equipos e
  where e.id = p_equipo_id
  limit 1;

  return query
  select *
  from public.validate_checklist_schedule(
    v_property_id,
    v_equipamento_id,
    p_submitted_at,
    p_equipo_id
  );
end;
$$;

grant execute on function public.validate_checklist_schedule(uuid, uuid, timestamptz, uuid)
  to authenticated;
grant execute on function public.validate_checklist_schedule(uuid, timestamptz)
  to authenticated;
