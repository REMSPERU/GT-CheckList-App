\set ON_ERROR_STOP on

begin;

create temp table piloto_verificacion on commit drop as
select u.id as tecnico_id, e.id as activo_id, e.codigo, e.id_property,
  e.id_equipamento, cs.id as schedule_id, cs.end_date, cs.timezone
from public.users u
cross join public.equipos e
join public.checklist_schedules cs
  on cs.property_id = e.id_property and cs.equipamento_id = e.id_equipamento
join public.properties p on p.id = e.id_property
where u.email = :'tecnico' and e.codigo = :'equipo' and p.code = 'LEU';

grant select on piloto_verificacion to authenticated;
select set_config('request.jwt.claim.sub', tecnico_id::text, true) is not null as sesion_prueba
from piloto_verificacion;
set local role authenticated;

do $$
declare
  fixture piloto_verificacion%rowtype;
  edited integer;
begin
  select * into strict fixture from piloto_verificacion;
  if public.get_user_role() is distinct from 'TECNICO' then
    raise exception 'Se requiere una cuenta de prueba con rol Técnico';
  end if;
  if not exists (select 1 from public.equipos where id = fixture.activo_id) then
    raise exception 'La cuenta no puede consultar el activo asignado';
  end if;
  update public.equipos set codigo = codigo where id = fixture.activo_id;
  get diagnostics edited = row_count;
  if edited <> 0 then
    raise exception 'El rol Técnico tiene permiso de edición de activos';
  end if;
  if fixture.end_date is null then
    raise exception 'El piloto requiere fecha de cierre';
  end if;
  if not exists (
    select 1 from public.current_checklist_property_templates
    where property_id = fixture.id_property and equipamento_id = fixture.id_equipamento
  ) then
    raise exception 'El técnico no puede consultar la plantilla del inmueble';
  end if;
  if exists (
    select 1 from public.validate_checklist_schedule(
      fixture.id_property, fixture.id_equipamento,
      ((fixture.end_date + 1) + time '12:00') at time zone fixture.timezone,
      fixture.activo_id
    ) where allowed
  ) then
    raise exception 'El calendario permite un registro posterior al cierre';
  end if;
  raise notice 'Consulta autorizada, edición bloqueada, plantilla accesible y cierre aplicado.';
end;
$$;

rollback;
