create or replace function public.unassign_auditor_from_property(
  p_auditor_id uuid,
  p_property_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not public.is_supervisor_or_admin_user() then
    raise exception 'No tiene permisos para quitar auditores';
  end if;

  if not public.is_auditor_user(p_auditor_id) then
    raise exception 'El usuario destino no tiene rol AUDITOR';
  end if;

  delete from public.user_properties
  where user_id = p_auditor_id
    and property_id = p_property_id
    and property_role = 'AUDITOR'::public.roleenum;
end;
$$;

grant execute on function public.unassign_auditor_from_property(uuid, uuid) to authenticated;
