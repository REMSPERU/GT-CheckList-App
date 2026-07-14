create table if not exists public.checklist_workday_config (
  id uuid default gen_random_uuid() not null,
  work_days integer[] not null default '{1,2,3,4,5}'::integer[],
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  constraint checklist_workday_config_pkey primary key (id),
  constraint checklist_workday_config_singleton_check check (id = '00000000-0000-0000-0000-000000000001'::uuid),
  constraint checklist_workday_config_work_days_check check (
    cardinality(work_days) > 0
    and work_days <@ array[1,2,3,4,5,6,7]
  )
);

create table if not exists public.checklist_workday_exceptions (
  id uuid default gen_random_uuid() not null,
  exception_date date not null,
  description varchar(255),
  is_working_day boolean not null default false,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null,
  constraint checklist_workday_exceptions_pkey primary key (id),
  constraint checklist_workday_exceptions_date_unique unique (exception_date)
);

insert into public.checklist_workday_config (id, work_days)
values ('00000000-0000-0000-0000-000000000001'::uuid, '{1,2,3,4,5}'::integer[])
on conflict (id) do nothing;

create index if not exists idx_checklist_workday_exceptions_date
  on public.checklist_workday_exceptions (exception_date);

drop trigger if exists trg_touch_checklist_workday_config_updated_at
  on public.checklist_workday_config;

create trigger trg_touch_checklist_workday_config_updated_at
  before update on public.checklist_workday_config
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_touch_checklist_workday_exceptions_updated_at
  on public.checklist_workday_exceptions;

create trigger trg_touch_checklist_workday_exceptions_updated_at
  before update on public.checklist_workday_exceptions
  for each row execute function public.set_updated_at_timestamp();

alter table public.checklist_workday_config enable row level security;
alter table public.checklist_workday_exceptions enable row level security;

grant select on table public.checklist_workday_config to anon, authenticated;
grant insert, update, delete on table public.checklist_workday_config to authenticated;
grant all on table public.checklist_workday_config to service_role;

grant select on table public.checklist_workday_exceptions to anon, authenticated;
grant insert, update, delete on table public.checklist_workday_exceptions to authenticated;
grant all on table public.checklist_workday_exceptions to service_role;

drop policy if exists checklist_workday_config_select
  on public.checklist_workday_config;
drop policy if exists checklist_workday_config_admin
  on public.checklist_workday_config;
drop policy if exists checklist_workday_exceptions_select
  on public.checklist_workday_exceptions;
drop policy if exists checklist_workday_exceptions_admin
  on public.checklist_workday_exceptions;

create policy checklist_workday_config_select
  on public.checklist_workday_config
  for select to authenticated
  using (true);

create policy checklist_workday_config_admin
  on public.checklist_workday_config
  for all to authenticated
  using (public.is_supervisor_or_admin_user())
  with check (public.is_supervisor_or_admin_user());

create policy checklist_workday_exceptions_select
  on public.checklist_workday_exceptions
  for select to authenticated
  using (true);

create policy checklist_workday_exceptions_admin
  on public.checklist_workday_exceptions
  for all to authenticated
  using (public.is_supervisor_or_admin_user())
  with check (public.is_supervisor_or_admin_user());

create or replace function public.is_checklist_working_day(p_date date)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_working boolean;
  v_day_of_week integer;
begin
  select cwe.is_working_day
  into v_is_working
  from public.checklist_workday_exceptions cwe
  where cwe.exception_date = p_date;

  if found then
    return v_is_working;
  end if;

  v_day_of_week := extract(isodow from p_date)::integer;

  select v_day_of_week = any(cwc.work_days)
  into v_is_working
  from public.checklist_workday_config cwc
  where cwc.id = '00000000-0000-0000-0000-000000000001'::uuid;

  if found then
    return v_is_working;
  end if;

  return v_day_of_week in (1, 2, 3, 4, 5);
end;
$$;

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

  if not public.is_checklist_working_day(v_local_date) then
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

revoke all on function public.is_checklist_working_day(date) from public, anon;
grant execute on function public.is_checklist_working_day(date) to authenticated;

revoke all on function public.validate_checklist_schedule(uuid, uuid, timestamptz, uuid)
  from public, anon;
grant execute on function public.validate_checklist_schedule(uuid, uuid, timestamptz, uuid)
  to authenticated;
