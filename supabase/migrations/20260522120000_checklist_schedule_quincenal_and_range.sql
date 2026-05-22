alter table public.checklist_schedules
  drop constraint if exists checklist_schedules_frequency_check;

alter table public.checklist_schedules
  drop constraint if exists checklist_schedules_execution_range_days_check;

alter table public.checklist_schedules
  add column if not exists execution_range_days integer;

update public.checklist_schedules
set execution_range_days = 1
where execution_range_days is null;

update public.checklist_schedules
set start_date = (
  created_at at time zone coalesce(nullif(timezone, ''), 'America/Lima')
)::date
where start_date is null;

update public.checklist_schedules
set execution_range_days = case frequency
  when 'DIARIA' then 1
  when 'INTERDIARIA' then least(greatest(execution_range_days, 1), 2)
  when 'SEMANAL' then least(greatest(execution_range_days, 1), 7)
  when 'QUINCENAL' then least(greatest(execution_range_days, 1), 15)
  when 'MENSUAL' then least(greatest(execution_range_days, 1), 31)
  else 1
end;

alter table public.checklist_schedules
  alter column execution_range_days set default 1,
  alter column execution_range_days set not null,
  alter column start_date set not null;

alter table public.checklist_schedules
  add constraint checklist_schedules_frequency_check
    check (
      frequency in (
        'DIARIA',
        'INTERDIARIA',
        'SEMANAL',
        'QUINCENAL',
        'MENSUAL'
      )
    );

alter table public.checklist_schedules
  add constraint checklist_schedules_execution_range_days_check
    check (
      case frequency
        when 'DIARIA' then execution_range_days = 1
        when 'INTERDIARIA' then execution_range_days between 1 and 2
        when 'SEMANAL' then execution_range_days between 1 and 7
        when 'QUINCENAL' then execution_range_days between 1 and 15
        when 'MENSUAL' then execution_range_days between 1 and 31
        else false
      end
    );

create or replace function public.get_checklist_target_date_for_month(
  anchor_date date,
  reference_date date
)
returns date
language sql
immutable
set search_path = public
as $$
  select (
    date_trunc('month', reference_date)::date
    + (
      least(
        extract(day from anchor_date)::integer,
        extract(
          day from (
            date_trunc('month', reference_date)::date
            + interval '1 month - 1 day'
          )
        )::integer
      ) - 1
    )
  )::date;
$$;

revoke all on function public.get_checklist_target_date_for_month(date, date)
  from public, anon, authenticated;

drop function if exists public.validate_checklist_schedule(uuid, timestamptz);
drop function if exists public.validate_checklist_schedule(uuid, timestamp with time zone);
drop function if exists public.validate_checklist_schedule(uuid, uuid, timestamptz);
drop function if exists public.validate_checklist_schedule(uuid, uuid, timestamp with time zone);

create or replace function public.validate_checklist_schedule(
  p_property_id uuid,
  p_equipamento_id uuid,
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
  current_count integer
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
  v_day_start_utc timestamptz;
  v_day_end_utc timestamptz;
  v_current_count integer := 0;
  v_days_from_anchor integer;
  v_is_frequency_day boolean := true;
begin
  if p_property_id is null or p_equipamento_id is null then
    return query
    select false, true, null::text, null::uuid, null::text,
      null::integer, null::time, null::time, 0;
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
      null::integer, null::time, null::time, 0;
    return;
  end if;

  v_tz := coalesce(nullif(v_schedule.timezone, ''), 'America/Lima');
  v_local_ts := p_submitted_at at time zone v_tz;
  v_local_date := v_local_ts::date;
  v_local_time := v_local_ts::time;
  v_anchor_date := coalesce(
    v_schedule.start_date,
    (v_schedule.created_at at time zone v_tz)::date
  );

  if v_local_date < v_anchor_date then
    return query
    select true, false, 'La programacion aun no inicia.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0;
    return;
  end if;

  if v_schedule.end_date is not null and v_local_date > v_schedule.end_date then
    return query
    select true, false, 'La programacion ya vencio.', v_schedule.id,
      v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0;
    return;
  end if;

  if not (
    v_local_time >= v_schedule.window_start
    and v_local_time <= v_schedule.window_end
  ) then
    return query
    select true, false, 'El checklist esta fuera del rango horario permitido.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0;
    return;
  end if;

  v_days_from_anchor := v_local_date - v_anchor_date;

  if v_schedule.frequency = 'INTERDIARIA' then
    v_is_frequency_day := mod(v_days_from_anchor, 2)
      < v_schedule.execution_range_days;
  elsif v_schedule.frequency = 'SEMANAL' then
    v_is_frequency_day := mod(v_days_from_anchor, 7)
      < v_schedule.execution_range_days;
  elsif v_schedule.frequency = 'QUINCENAL' then
    v_is_frequency_day := mod(v_days_from_anchor, 15)
      < v_schedule.execution_range_days;
  elsif v_schedule.frequency = 'MENSUAL' then
    v_is_frequency_day := exists (
      select 1
      from (
        values
          (
            public.get_checklist_target_date_for_month(
              v_anchor_date,
              (v_local_date - interval '1 month')::date
            )
          ),
          (
            public.get_checklist_target_date_for_month(
              v_anchor_date,
              v_local_date
            )
          ),
          (
            public.get_checklist_target_date_for_month(
              v_anchor_date,
              (v_local_date + interval '1 month')::date
            )
          )
      ) as targets(target_date)
      where targets.target_date >= v_anchor_date
        and v_local_date between targets.target_date
          and (targets.target_date + v_schedule.execution_range_days - 1)
    );
  end if;

  if not v_is_frequency_day then
    return query
    select true, false,
      'Hoy no corresponde por frecuencia o rango de ejecucion.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0;
    return;
  end if;

  v_day_start_utc := v_local_date::timestamp at time zone v_tz;
  v_day_end_utc := (v_local_date + 1)::timestamp at time zone v_tz;

  select count(*)::integer
  into v_current_count
  from public.checklist_response cr
  join public.equipos e on e.id = cr.equipo_id
  where e.id_property = p_property_id
    and e.id_equipamento = p_equipamento_id
    and cr.submitted_at >= v_day_start_utc
    and cr.submitted_at < v_day_end_utc;

  if v_current_count >= v_schedule.occurrences_per_day then
    return query
    select true, false,
      'Se alcanzo el maximo de checklist permitidos para hoy.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, v_current_count;
    return;
  end if;

  return query
  select true, true, null::text, v_schedule.id, v_schedule.frequency,
    v_schedule.occurrences_per_day, v_schedule.window_start,
    v_schedule.window_end, v_current_count;
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
  current_count integer
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
    p_submitted_at
  );
end;
$$;

revoke all on function public.validate_checklist_schedule(uuid, uuid, timestamptz)
  from public, anon;

revoke all on function public.validate_checklist_schedule(uuid, timestamptz)
  from public, anon;

grant execute on function public.validate_checklist_schedule(uuid, uuid, timestamptz)
  to authenticated;

grant execute on function public.validate_checklist_schedule(uuid, timestamptz)
  to authenticated;

notify pgrst, 'reload schema';