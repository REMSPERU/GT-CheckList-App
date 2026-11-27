create function public.create_gema_web_equipment(
  p_property_id uuid,
  p_equipment_type_id uuid,
  p_code text,
  p_location text,
  p_location_detail text default null
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_code text := upper(btrim(p_code));
  v_id uuid := gen_random_uuid();
begin
  if public.get_user_role() is null or public.get_user_role() not in ('SUPERADMIN', 'SUPERVISOR') then
    raise exception 'Tu rol no permite registrar activos' using errcode = '42501';
  end if;
  if v_code is null or v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,49}$' then
    raise exception 'Ingresa un código de inventario válido' using errcode = '22023';
  end if;
  if nullif(btrim(p_location), '') is null or length(p_location_detail) > 200 then
    raise exception 'Selecciona una ubicación y revisa su detalle' using errcode = '22023';
  end if;
  if not exists (select 1 from public.properties p where p.id = p_property_id and p.is_active)
    or not exists (select 1 from public.equipamentos e where e.id = p_equipment_type_id) then
    raise exception 'Selecciona un inmueble activo y un tipo de activo existente' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_property_id::text || ':' || v_code, 0));
  if exists (
    select 1 from public.equipos e where e.id_property = p_property_id and upper(btrim(e.codigo)) = v_code
  ) then
    raise exception 'Ese código ya está registrado en el inmueble' using errcode = '23505';
  end if;

  insert into public.equipos (id, id_property, id_equipamento, codigo, ubicacion, detalle_ubicacion, estatus, config, equipment_detail)
  values (v_id, p_property_id, p_equipment_type_id, v_code, btrim(p_location),
    nullif(btrim(p_location_detail), ''), 'ACTIVO', false, '{}'::jsonb);
  return v_id;
end;
$$;

revoke execute on function public.create_gema_web_equipment(uuid, uuid, text, text, text) from public;
grant execute on function public.create_gema_web_equipment(uuid, uuid, text, text, text) to authenticated;
