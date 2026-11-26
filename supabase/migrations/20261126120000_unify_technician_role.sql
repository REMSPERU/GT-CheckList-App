-- Consolidate both technician profiles without replacing users or assignments.
begin;

update public.users set role = 'TECNICO' where role = 'TECNICO_REMS';
update public.user_properties
set property_role = 'TECNICO'
where property_role = 'TECNICO_REMS';

alter table public.users add constraint users_no_legacy_technician
  check (role <> 'TECNICO_REMS');
alter table public.user_properties add constraint user_properties_no_legacy_technician
  check (property_role <> 'TECNICO_REMS');

-- Historical audit records continue to accept the old enum value.
-- Application/API role assignment accepts only the current role names.

CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."roleenum"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.is_active = true
$$;



CREATE OR REPLACE FUNCTION "public"."has_audit_property_assignment"("p_property_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_properties up
    where up.user_id = p_user_id
      and up.property_id = p_property_id
      and (up.expires_at is null or up.expires_at > now())
      and (
        up.property_role is null
        or up.property_role in (
          'AUDITOR'::public.roleenum,
          'TECNICO'::public.roleenum,
          'SUPERVISOR'::public.roleenum,
          'SUPERADMIN'::public.roleenum
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION "public"."can_read_property"("p_property_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case
    when p_user_id is null then false
    when exists (
      select 1 from public.users u
      where u.id = p_user_id and u.role in ('AUDITOR', 'TECNICO')
    )
      then public.has_audit_property_assignment(p_property_id, p_user_id)
    else true
  end;
$$;

CREATE OR REPLACE FUNCTION "public"."assign_auditor_to_property"("p_auditor_id" "uuid", "p_property_id" "uuid", "p_assignment_reason" "text" DEFAULT NULL::"text", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "public"."user_properties"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  assigned_row public.user_properties;
  v_role public.roleenum;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if public.get_user_role() is distinct from 'SUPERADMIN' then
    raise exception 'No tiene permisos para asignar usuarios';
  end if;

  if not (exists (
    select 1 from public.users u
    where u.id = p_auditor_id and u.is_active and u.role in ('AUDITOR', 'TECNICO')
  )) then
    raise exception 'El usuario destino no tiene un rol asignable (AUDITOR o TECNICO)';
  end if;

  select role into v_role from public.users where id = p_auditor_id;

  insert into public.user_properties (
    user_id,
    property_id,
    assigned_by,
    assignment_reason,
    expires_at,
    property_role,
    assigned_at,
    created_at,
    updated_at
  ) values (
    p_auditor_id,
    p_property_id,
    auth.uid(),
    p_assignment_reason,
    p_expires_at,
    v_role,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id, property_id)
  do update set
    assigned_by = excluded.assigned_by,
    assignment_reason = excluded.assignment_reason,
    expires_at = excluded.expires_at,
    property_role = v_role,
    assigned_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning * into assigned_row;

  return assigned_row;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."unassign_auditor_from_property"("p_auditor_id" "uuid", "p_property_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if public.get_user_role() is distinct from 'SUPERADMIN' then
    raise exception 'No tiene permisos para quitar usuarios';
  end if;

  if not (exists (
    select 1 from public.users u
    where u.id = p_auditor_id and u.is_active and u.role in ('AUDITOR', 'TECNICO')
  )) then
    raise exception 'El usuario destino no tiene un rol asignable (AUDITOR o TECNICO)';
  end if;

  delete from public.user_properties
  where user_id = p_auditor_id
    and property_id = p_property_id
    and property_role in ('AUDITOR'::public.roleenum, 'TECNICO'::public.roleenum);
end;
$$;

-- Scope used only by the equipment inventory. The regular properties RLS
-- policy remains assignment-based for auditors in every other module.
create or replace function public.list_equipment_active_properties()
returns table (
  id uuid,
  code text,
  name text,
  address text,
  city text,
  image_url text,
  floor integer,
  basement integer,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.code, p.name, p.address, p.city, p.image_url,
         p.floor, p.basement, p.is_active
  from public.properties p
  join public.users u on u.id = auth.uid()
  where u.is_active = true
    and u.role in ('AUDITOR', 'SUPERADMIN', 'SUPERVISOR')
    and p.is_active = true
    and public.can_read_property(p.id, u.id)
  order by p.name asc;
$$;

grant execute on function public.list_equipment_active_properties() to authenticated;

-- Restrictive policies also apply when an older permissive policy is present.
create policy gema_users_role_insert on public.users as restrictive
for insert to authenticated with check (
  public.get_user_role() = 'SUPERADMIN' and role <> 'TECNICO_REMS'
);

create policy gema_users_role_update on public.users as restrictive
for update to authenticated using (public.get_user_role() = 'SUPERADMIN')
with check (public.get_user_role() = 'SUPERADMIN' and role <> 'TECNICO_REMS');

create policy gema_property_assignments_admin on public.user_properties as restrictive
for insert to authenticated with check (
  public.get_user_role() = 'SUPERADMIN' and property_role is distinct from 'TECNICO_REMS'
);

create policy gema_property_assignments_update on public.user_properties as restrictive
for update to authenticated using (public.get_user_role() = 'SUPERADMIN')
with check (public.get_user_role() = 'SUPERADMIN' and property_role is distinct from 'TECNICO_REMS');

create policy gema_equipos_read on public.equipos as restrictive
for select to authenticated using (
  public.get_user_role() in ('TECNICO', 'AUDITOR', 'SUPERVISOR', 'SUPERADMIN')
  and public.can_read_property(id_property)
);

create policy gema_equipos_create on public.equipos as restrictive
for insert to authenticated with check (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
);

create policy gema_equipos_edit on public.equipos as restrictive
for update to authenticated using (
  public.get_user_role() in ('AUDITOR', 'SUPERVISOR', 'SUPERADMIN')
  and public.can_read_property(id_property)
) with check (
  public.get_user_role() in ('AUDITOR', 'SUPERVISOR', 'SUPERADMIN')
  and public.can_read_property(id_property)
);

create policy gema_checklist_schedule_insert on public.checklist_schedules as restrictive
for insert to authenticated with check (public.get_user_role() = 'SUPERADMIN');
create policy gema_checklist_schedule_update on public.checklist_schedules as restrictive
for update to authenticated using (public.get_user_role() = 'SUPERADMIN')
with check (public.get_user_role() = 'SUPERADMIN');
create policy gema_checklist_schedule_delete on public.checklist_schedules as restrictive
for delete to authenticated using (public.get_user_role() = 'SUPERADMIN');
create policy gema_checklist_schedule_read on public.checklist_schedules as restrictive
for select to authenticated using (
  public.get_user_role() in ('TECNICO','AUDITOR','SUPERVISOR','SUPERADMIN')
  and public.can_read_property(property_id)
);

create policy gema_checklist_response_read on public.checklist_response as restrictive
for select to authenticated using (
  public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN')
  or (
    public.get_user_role() in ('TECNICO', 'AUDITOR')
    and exists (select 1 from public.equipos e where e.id = checklist_response.equipo_id)
  )
);

create policy gema_checklist_response_submit on public.checklist_response as restrictive
for insert to authenticated with check (
  user_created = (select auth.uid())
  and public.get_user_role() in ('TECNICO', 'AUDITOR', 'SUPERADMIN')
  and exists (
    select 1 from public.equipos e
    where e.id = checklist_response.equipo_id
      and e.id_equipamento = checklist_response.equipamento_id
      and (
        public.get_user_role() <> 'TECNICO'
        or exists (
          select 1 from public.checklist_schedules cs
          where cs.id = checklist_response.checklist_schedule_id
            and cs.property_id = e.id_property
            and cs.equipamento_id = e.id_equipamento
        )
      )
  )
);

create policy gema_checklist_response_update on public.checklist_response as restrictive
for update to authenticated using (public.get_user_role() = 'SUPERADMIN')
with check (public.get_user_role() = 'SUPERADMIN');

create policy gema_maintenance_schedule_insert on public.mantenimientos as restrictive
for insert to authenticated with check (public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN'));
create policy gema_maintenance_schedule_update on public.mantenimientos as restrictive
for update to authenticated using (public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN'))
with check (public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN'));
create policy gema_maintenance_response_insert on public.maintenance_response as restrictive
for insert to authenticated with check (public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN'));
create policy gema_maintenance_response_update on public.maintenance_response as restrictive
for update to authenticated using (public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN'))
with check (public.get_user_role() in ('SUPERVISOR', 'SUPERADMIN'));

-- An auditor can update details of an assigned asset. Lifecycle changes and
-- transfers remain in the existing management flow.
create or replace function public.guard_gema_asset_lifecycle()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.get_user_role() = 'AUDITOR'
    and (new.estatus is distinct from old.estatus
      or new.id_property is distinct from old.id_property
      or new.id is distinct from old.id) then
    raise exception 'El auditor no puede cambiar el estado ni trasladar el activo'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_guard_gema_asset_lifecycle
before update on public.equipos
for each row execute function public.guard_gema_asset_lifecycle();

commit;
