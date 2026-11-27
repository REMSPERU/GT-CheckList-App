begin;

-- Keep existing providers without a company unable to access maintenance.
-- New assignments must set the company at the same time as the role.
alter table public.users add constraint gema_provider_requires_company
  check (role <> 'PROVEEDOR' or id_company is not null) not valid;

create or replace function public.gema_provider_company()
returns uuid language sql stable security definer set search_path = ''
as $$
  select u.id_company from public.users u
  where u.id = (select auth.uid()) and u.is_active and u.role = 'PROVEEDOR'
$$;

create or replace function public.list_gema_provider_properties()
returns table (property_id uuid) language sql stable security definer set search_path = ''
as $$
  select cp.id_property
  from public.company_property cp
  join public.properties p on p.id = cp.id_property
  where cp.id_company = public.gema_provider_company() and p.is_active
$$;

revoke all on function public.gema_provider_company() from public;
revoke all on function public.list_gema_provider_properties() from public;
grant execute on function public.gema_provider_company() to authenticated;
grant execute on function public.list_gema_provider_properties() to authenticated;

create or replace function public.can_read_property(
  p_property_id uuid, p_user_id uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case u.role
      when 'PROVEEDOR' then exists (
        select 1 from public.company_property cp
        join public.properties p on p.id = cp.id_property
        where cp.id_company = u.id_company and cp.id_property = p_property_id and p.is_active
      )
      when 'AUDITOR' then public.has_audit_property_assignment(p_property_id, p_user_id)
      when 'TECNICO' then public.has_audit_property_assignment(p_property_id, p_user_id)
      else true
    end
    from public.users u where u.id = p_user_id and u.is_active
  ), false)
$$;

-- Provider permissions inherit company-property assignments. Only an
-- administrator can change the association that grants that access.
create policy gema_provider_property_scope on public.properties as restrictive
for select to authenticated using (
  public.get_user_role() <> 'PROVEEDOR' or public.can_read_property(id)
);

create policy gema_provider_company_property_scope on public.company_property as restrictive
for select to authenticated using (
  public.get_user_role() <> 'PROVEEDOR'
  or id_company = public.gema_provider_company()
);

create policy gema_company_property_insert on public.company_property as restrictive
for insert to authenticated with check (public.get_user_role() = 'SUPERADMIN');
create policy gema_company_property_update on public.company_property as restrictive
for update to authenticated using (public.get_user_role() = 'SUPERADMIN')
with check (public.get_user_role() = 'SUPERADMIN');
create policy gema_company_property_delete on public.company_property
for delete to authenticated using (public.get_user_role() = 'SUPERADMIN');
create policy gema_company_property_delete_scope on public.company_property as restrictive
for delete to authenticated using (public.get_user_role() = 'SUPERADMIN');
grant delete on public.company_property to authenticated;

create policy gema_provider_user_scope on public.users as restrictive
for select to authenticated using (
  public.get_user_role() <> 'PROVEEDOR'
  or id = (select auth.uid())
  or (role = 'PROVEEDOR' and is_active and id_company = public.gema_provider_company())
);

alter policy gema_equipos_read on public.equipos using (
  public.get_user_role() in ('TECNICO', 'AUDITOR', 'SUPERVISOR', 'SUPERADMIN', 'PROVEEDOR')
  and public.can_read_property(id_property)
);

create policy gema_provider_read_maintenance on public.mantenimientos as restrictive
for select to authenticated using (
  public.get_user_role() <> 'PROVEEDOR'
  or exists (
    select 1 from public.equipos e
    where e.id = mantenimientos.id_equipo
      and (
        mantenimientos.id_sesion is null
        or exists (
          select 1 from public.sesion_mantenimiento sm
          where sm.id = mantenimientos.id_sesion and sm.id_property = e.id_property
        )
      )
  )
);
alter policy gema_maintenance_schedule_insert on public.mantenimientos with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (
    public.get_user_role() = 'PROVEEDOR'
    and exists (
      select 1 from public.equipos e
      join public.sesion_mantenimiento sm on sm.id_property = e.id_property
      where e.id = mantenimientos.id_equipo and sm.id = mantenimientos.id_sesion
    )
  )
);
alter policy gema_maintenance_schedule_update on public.mantenimientos using (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR'
    and exists (select 1 from public.equipos e where e.id = mantenimientos.id_equipo))
) with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR'
    and exists (
      select 1 from public.equipos e
      where e.id = mantenimientos.id_equipo
        and (
          mantenimientos.id_sesion is null
          or exists (
            select 1 from public.sesion_mantenimiento sm
            where sm.id = mantenimientos.id_sesion and sm.id_property = e.id_property
          )
        )
    )
  )
);

create policy gema_provider_read_maintenance_response on public.maintenance_response as restrictive
for select to authenticated using (
  public.get_user_role() <> 'PROVEEDOR'
  or exists (select 1 from public.mantenimientos m where m.id = maintenance_response.id_mantenimiento)
);
alter policy gema_maintenance_response_insert on public.maintenance_response with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR' and user_created = (select auth.uid())
    and exists (select 1 from public.mantenimientos m where m.id = maintenance_response.id_mantenimiento))
);
alter policy gema_maintenance_response_update on public.maintenance_response using (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR'
    and exists (select 1 from public.mantenimientos m where m.id = maintenance_response.id_mantenimiento))
) with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR'
    and exists (select 1 from public.mantenimientos m where m.id = maintenance_response.id_mantenimiento))
);

create policy gema_provider_session_read on public.sesion_mantenimiento as restrictive
for select to authenticated using (
  public.get_user_role() <> 'PROVEEDOR' or public.can_read_property(id_property)
);
create policy gema_provider_session_insert on public.sesion_mantenimiento as restrictive
for insert to authenticated with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR'
    and public.can_read_property(id_property) and created_by = (select auth.uid()))
);
create policy gema_provider_session_update on public.sesion_mantenimiento as restrictive
for update to authenticated using (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR' and public.can_read_property(id_property))
) with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR' and public.can_read_property(id_property))
);

create function public.guard_provider_maintenance_session_property()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.get_user_role() = 'PROVEEDOR' and new.id_property is distinct from old.id_property then
    raise exception 'El proveedor no puede trasladar una sesión de mantenimiento'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_guard_provider_maintenance_session_property
before update of id_property on public.sesion_mantenimiento
for each row execute function public.guard_provider_maintenance_session_property();

create policy gema_provider_session_photos on public.sesion_mantenimiento_fotos as restrictive
for all to authenticated using (
  public.get_user_role() <> 'PROVEEDOR'
  or exists (select 1 from public.sesion_mantenimiento sm where sm.id = sesion_mantenimiento_fotos.id_sesion)
) with check (
  public.get_user_role() <> 'PROVEEDOR'
  or exists (select 1 from public.sesion_mantenimiento sm where sm.id = sesion_mantenimiento_fotos.id_sesion)
);

create policy gema_maintenance_session_photo_insert on public.sesion_mantenimiento_fotos as restrictive
for insert to authenticated with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (public.get_user_role() = 'PROVEEDOR' and created_by = (select auth.uid())
    and exists (select 1 from public.sesion_mantenimiento sm where sm.id = sesion_mantenimiento_fotos.id_sesion))
);

create policy gema_provider_session_assignment on public.user_sesion_mantenimiento as restrictive
for all to authenticated using (
  public.get_user_role() <> 'PROVEEDOR'
  or exists (select 1 from public.sesion_mantenimiento sm where sm.id = user_sesion_mantenimiento.id_sesion)
) with check (
  public.get_user_role() <> 'PROVEEDOR'
  or (
    exists (select 1 from public.sesion_mantenimiento sm where sm.id = user_sesion_mantenimiento.id_sesion)
    and exists (
      select 1 from public.users u where u.id = user_sesion_mantenimiento.id_user
        and u.role = 'PROVEEDOR' and u.is_active and u.id_company = public.gema_provider_company()
    )
  )
);

commit;
