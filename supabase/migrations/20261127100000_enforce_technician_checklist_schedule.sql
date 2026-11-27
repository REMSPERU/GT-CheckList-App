create function public.guard_technician_checklist_schedule()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  asset_property_id uuid;
  schedule_end date;
  validation record;
begin
  if public.get_user_role() is distinct from 'TECNICO' then
    return new;
  end if;

  select e.id_property, cs.end_date into asset_property_id, schedule_end
  from public.equipos e
  join public.checklist_schedules cs
    on cs.id = new.checklist_schedule_id and cs.property_id = e.id_property
    and cs.equipamento_id = e.id_equipamento and cs.is_active
  where e.id = new.equipo_id and e.id_equipamento = new.equipamento_id
    and e.estatus is distinct from 'INACTIVO'
    and public.can_read_property(e.id_property);

  if not found or new.user_created is distinct from (select auth.uid()) then
    raise exception 'El equipo no tiene una programación activa asignada'
      using errcode = '42501';
  end if;

  -- Serialize submissions for the same asset even when they come from different devices.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.equipo_id::text, 0));

  if exists (
    select 1 from public.checklist_response cr
    where cr.client_submission_id = new.client_submission_id
      and cr.user_created = new.user_created and cr.equipo_id = new.equipo_id
  ) then
    return new;
  end if;

  select * into strict validation from public.validate_checklist_schedule(
    asset_property_id, new.equipamento_id, new.submitted_at, new.equipo_id
  );

  if validation.current_count >= validation.occurrences_per_day then
    raise exception 'El equipo alcanzó el límite de checklists del periodo'
      using errcode = '23505';
  end if;

  if validation.allowed is distinct from true
    or validation.schedule_id is distinct from new.checklist_schedule_id
    or validation.frequency is distinct from new.frequency
    or validation.period_start is distinct from new.period_start
    or least(validation.period_end, schedule_end) is distinct from new.period_end then
    raise exception '%', coalesce(validation.reason, 'La respuesta no corresponde al periodo programado')
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_technician_checklist_schedule() from public, anon, authenticated;

create trigger trg_guard_technician_checklist_schedule
before insert on public.checklist_response
for each row execute function public.guard_technician_checklist_schedule();
