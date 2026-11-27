-- Primero ejecutar sin aplicar para revisar el lote.
-- psql -X -v inmueble=UUID -v tipo_fan_coil=UUID -v desde=AAAA-MM-DD \
--   -v hasta=AAAA-MM-DD -v hora_inicio=HH:MM -v hora_fin=HH:MM \
--   -f scripts/configurar-piloto-leuro.sql
-- Añadir -v aplicar=true para guardar. Usa la conexión seleccionada en psql.
-- Conserva el calendario de días laborables y las excepciones del proyecto.
\set ON_ERROR_STOP on
\if :{?aplicar}
\else
  \set aplicar false
\endif

begin;

create temp table piloto_leuro on commit drop as
select :'inmueble'::uuid as property_id,
       :'tipo_fan_coil'::uuid as equipamento_id,
       :'desde'::date as desde,
       :'hasta'::date as hasta,
       :'hora_inicio'::time as hora_inicio,
       :'hora_fin'::time as hora_fin;

-- Serialize the brief check and insert only when applying the configuration.
\if :aplicar
  lock table public.checklist_schedules in share row exclusive mode;
\endif

do $$
declare
  lote record;
begin
  select * into strict lote from piloto_leuro;

  if lote.hasta - lote.desde not between 0 and 14 then
    raise exception 'El lote debe tener de 1 a 15 días, contando inicio y cierre.';
  end if;
  if lote.hora_inicio >= lote.hora_fin then
    raise exception 'La hora inicial debe ser anterior a la final.';
  end if;

  if not exists (
    select 1 from public.properties p
    where p.id = lote.property_id and p.is_active
      and upper(btrim(p.name)) = 'CENTRO EMPRESARIAL LEURO'
  ) then
    raise exception 'El inmueble indicado no corresponde al Centro Empresarial Leuro activo.';
  end if;

  if not exists (
    select 1 from public.equipamentos e
    join public.sistemas s on s.id = e.id_sistema
    where e.id = lote.equipamento_id
      and upper(translate(btrim(s.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
        in ('CLIMATIZACION', 'CLIMATIZACION Y HVAC', 'HVAC')
      and regexp_replace(lower(e.nombre), '[^a-z]', '', 'g') in ('fancoil', 'fancoils')
  ) then
    raise exception 'El tipo indicado debe ser Fan coil de Climatización.';
  end if;

  if not exists (
    select 1 from public.equipos e
    where e.id_property = lote.property_id
      and e.id_equipamento = lote.equipamento_id
      and e.estatus is distinct from 'INACTIVO'
  ) then
    raise exception 'Leuro no tiene fan coils activos para este tipo.';
  end if;

  if not exists (
    select 1 from public.current_checklist_property_templates t
    where t.property_id = lote.property_id and t.equipamento_id = lote.equipamento_id
  ) then
    raise exception 'Publica primero la plantilla de Fan coils para Leuro.';
  end if;

  if exists (
    select 1 from public.checklist_schedules cs
    join public.equipamentos e on e.id = cs.equipamento_id
    left join public.sistemas s on s.id = e.id_sistema
    where cs.property_id = lote.property_id and cs.is_active
      and cs.start_date <= lote.hasta
      and (cs.end_date is null or cs.end_date >= lote.desde)
      and coalesce(upper(translate(btrim(s.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')), '')
        not in ('CLIMATIZACION', 'CLIMATIZACION Y HVAC', 'HVAC')
  ) then
    raise exception 'Hay otra especialidad programada en Leuro durante el lote. Revísala en el panel.';
  end if;

  if exists (
    select 1 from public.checklist_schedules cs
    where cs.property_id = lote.property_id and cs.equipamento_id = lote.equipamento_id
      and (
        not cs.is_active or cs.frequency <> 'QUINCENAL'
        or cs.start_date is distinct from lote.desde or cs.end_date is distinct from lote.hasta
        or cs.window_start <> lote.hora_inicio or cs.window_end <> lote.hora_fin
        or cs.timezone <> 'America/Lima'
        or cs.occurrences_per_day <> 1
        or cs.execution_range_days <> lote.hasta - lote.desde + 1
      )
  ) then
    raise exception 'Ya existe una regla distinta de Fan coils en Leuro. Revísala en el panel antes de reemplazarla.';
  end if;
end
$$;

select p.name as inmueble, e.nombre as tipo, lote.desde, lote.hasta,
       lote.hora_inicio, lote.hora_fin,
       (
         select count(*) from public.equipos eq
         where eq.id_property = lote.property_id
           and eq.id_equipamento = lote.equipamento_id
           and eq.estatus is distinct from 'INACTIVO'
       ) as equipos_activos
from piloto_leuro lote
join public.properties p on p.id = lote.property_id
join public.equipamentos e on e.id = lote.equipamento_id;

\if :aplicar
  insert into public.checklist_schedules (
    property_id, equipamento_id, frequency, occurrences_per_day,
    execution_range_days, window_start, window_end, timezone,
    start_date, end_date, is_active
  )
  select property_id, equipamento_id, 'QUINCENAL', 1,
         hasta - desde + 1, hora_inicio, hora_fin, 'America/Lima',
         desde, hasta, true
  from piloto_leuro
  on conflict (property_id, equipamento_id) do nothing;
  commit;
\else
  rollback;
\endif
