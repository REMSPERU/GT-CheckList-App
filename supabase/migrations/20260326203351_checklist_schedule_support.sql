create table if not exists public.checklist_schedules (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  frequency text not null,
  occurrences_per_day integer not null default 1,
  window_start time not null,
  window_end time not null,
  timezone text not null default 'America/Lima',
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (equipo_id),
  constraint checklist_schedules_frequency_check
    check (frequency in ('DIARIA', 'INTERDIARIA', 'SEMANAL', 'MENSUAL')),
  constraint checklist_schedules_occurrences_per_day_check
    check (occurrences_per_day between 1 and 24),
  constraint checklist_schedules_window_range_check
    check (window_start < window_end),
  constraint checklist_schedules_date_range_check
    check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists idx_checklist_schedules_active
  on public.checklist_schedules (is_active, equipo_id);

alter table public.checklist_schedules enable row level security;

create or replace function public.is_supervisor_or_admin()
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

grant execute on function public.is_supervisor_or_admin() to authenticated;

drop policy if exists checklist_schedules_select on public.checklist_schedules;
create policy checklist_schedules_select
on public.checklist_schedules
for select
to authenticated
using (true);

drop policy if exists checklist_schedules_insert on public.checklist_schedules;
create policy checklist_schedules_insert
on public.checklist_schedules
for insert
to authenticated
with check (public.is_supervisor_or_admin());

drop policy if exists checklist_schedules_update on public.checklist_schedules;
create policy checklist_schedules_update
on public.checklist_schedules
for update
to authenticated
using (public.is_supervisor_or_admin())
with check (public.is_supervisor_or_admin());

drop policy if exists checklist_schedules_delete on public.checklist_schedules;
create policy checklist_schedules_delete
on public.checklist_schedules
for delete
to authenticated
using (public.is_supervisor_or_admin());

create or replace function public.touch_checklist_schedules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_checklist_schedules_updated_at
  on public.checklist_schedules;
create trigger trg_touch_checklist_schedules_updated_at
before update on public.checklist_schedules
for each row
execute function public.touch_checklist_schedules_updated_at();

alter table public.checklist_response
  add column if not exists checklist_schedule_id uuid
    references public.checklist_schedules(id) on delete set null;

create index if not exists idx_checklist_response_equipo_submitted_at
  on public.checklist_response (equipo_id, submitted_at desc);

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
  v_schedule public.checklist_schedules%rowtype;
  v_tz text;
  v_local_ts timestamp;
  v_local_date date;
  v_local_time time;
  v_anchor_date date;
  v_last_day_of_month date;
  v_day_start_utc timestamptz;
  v_day_end_utc timestamptz;
  v_current_count integer := 0;
begin
  select *
  into v_schedule
  from public.checklist_schedules cs
  where cs.equipo_id = p_equipo_id
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
  v_anchor_date := coalesce(v_schedule.start_date, v_schedule.created_at::date);

  if v_schedule.start_date is not null and v_local_date < v_schedule.start_date then
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

  if not (v_local_time >= v_schedule.window_start and v_local_time <= v_schedule.window_end) then
    return query
    select true, false, 'El checklist esta fuera del rango horario permitido.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0;
    return;
  end if;

  if v_schedule.frequency = 'INTERDIARIA' then
    if v_local_date < v_anchor_date or mod(v_local_date - v_anchor_date, 2) <> 0 then
      return query
      select true, false, 'Hoy no corresponde por frecuencia interdiaria.',
        v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
        v_schedule.window_start, v_schedule.window_end, 0;
      return;
    end if;
  elsif v_schedule.frequency = 'SEMANAL' then
    if v_local_date < v_anchor_date
      or extract(isodow from v_local_date) <> extract(isodow from v_anchor_date) then
      return query
      select true, false, 'Hoy no corresponde por frecuencia semanal.',
        v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
        v_schedule.window_start, v_schedule.window_end, 0;
      return;
    end if;
  elsif v_schedule.frequency = 'MENSUAL' then
    v_last_day_of_month := (
      date_trunc('month', v_local_date)::date + interval '1 month - 1 day'
    )::date;

    if v_local_date < v_anchor_date then
      return query
      select true, false, 'Hoy no corresponde por frecuencia mensual.',
        v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
        v_schedule.window_start, v_schedule.window_end, 0;
      return;
    end if;

    if not (
      extract(day from v_local_date) = extract(day from v_anchor_date)
      or (
        extract(day from v_anchor_date) > extract(day from v_last_day_of_month)
        and v_local_date = v_last_day_of_month
      )
    ) then
      return query
      select true, false, 'Hoy no corresponde por frecuencia mensual.',
        v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
        v_schedule.window_start, v_schedule.window_end, 0;
      return;
    end if;
  end if;

  v_day_start_utc := v_local_date::timestamp at time zone v_tz;
  v_day_end_utc := (v_local_date + 1)::timestamp at time zone v_tz;

  select count(*)::integer
  into v_current_count
  from public.checklist_response cr
  where cr.equipo_id = p_equipo_id
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

grant execute on function public.validate_checklist_schedule(uuid, timestamptz)
  to authenticated;
