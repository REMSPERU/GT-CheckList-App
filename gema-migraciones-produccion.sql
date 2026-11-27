-- GEMA | migraciones de la entrega para el piloto de Leuro
-- Ejecutar el archivo completo una vez en el SQL Editor del proyecto GEMA de producción.
-- Si alguna instrucción falla, la transacción completa se revierte.
begin;

-- Compatible con proyectos que aún no tienen la migración base de plantillas.
do $preparar_plantillas$
begin
  if to_regclass('public.checklist_property_templates') is null
    and to_regclass('public.current_checklist_property_templates') is null
    and to_regprocedure('public.valid_checklist_template_questions(jsonb)') is null then
    execute $crear_plantillas$

create function public.valid_checklist_template_questions(questions jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when jsonb_typeof(questions) <> 'array' then false
    else (
      select count(*) between 1 and 200
        and count(distinct item->>'id') = count(*)
        and bool_and(coalesce(
          jsonb_typeof(item->'id') = 'string'
          and (item->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and jsonb_typeof(item->'text') = 'string'
          and length(btrim(item->>'text')) between 1 and 1000
          and weight > 0 and weight <= 1
          and weight = round(weight, 4),
          false
        ))
        and sum(weight) = 1
      from jsonb_array_elements(questions) as question(item)
      cross join lateral (
        select case when jsonb_typeof(item->'weight') = 'number'
          then (item->>'weight')::numeric
        end as weight
      ) as percentage
    )
  end
$$;

create table public.checklist_property_templates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  equipamento_id uuid not null references public.equipamentos(id),
  version integer not null check (version > 0),
  questions jsonb not null check (public.valid_checklist_template_questions(questions)),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references public.users(id),
  unique (property_id, equipamento_id, version)
);

alter table public.checklist_property_templates enable row level security;

revoke all on public.checklist_property_templates from public, anon, authenticated;
grant select, insert on public.checklist_property_templates to authenticated;

create policy checklist_property_templates_select
on public.checklist_property_templates for select to authenticated
using (
  exists (
    select 1 from public.properties property
    where property.id = checklist_property_templates.property_id
  )
);

create policy checklist_property_templates_publish
on public.checklist_property_templates for insert to authenticated
with check (
  public.get_user_role() = 'SUPERADMIN'
  and created_by = auth.uid()
  and exists (
    select 1 from public.equipos asset
    where asset.id_property = checklist_property_templates.property_id
      and asset.id_equipamento = checklist_property_templates.equipamento_id
  )
);

create view public.current_checklist_property_templates
with (security_invoker = true)
as
select distinct on (property_id, equipamento_id)
  id, property_id, equipamento_id, version, questions, created_at
from public.checklist_property_templates
order by property_id, equipamento_id, version desc;

revoke all on public.current_checklist_property_templates from public, anon, authenticated;
grant select on public.current_checklist_property_templates to authenticated;

    $crear_plantillas$;
  elsif to_regclass('public.checklist_property_templates') is null
    or to_regclass('public.current_checklist_property_templates') is null
    or to_regprocedure('public.valid_checklist_template_questions(jsonb)') is null then
    raise exception 'La migración base de plantillas existe incompleta';
  end if;
end;
$preparar_plantillas$;

-- 20261126120000_unify_technician_role.sql

-- Consolidate both technician profiles without replacing users or assignments.


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

-- 20261126130000_provider_maintenance_access.sql

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

-- 20261127100000_enforce_technician_checklist_schedule.sql

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

-- 20261127113000_property_hvac_operability.sql

create function public.get_gema_property_hvac_operability()
returns table (
  property_id uuid,
  percent numeric,
  assessed_assets integer,
  hvac_assets integer
)
language sql stable security invoker set search_path = ''
as $$
  with latest as (
    select e.id_property, response.summary
    from public.equipos e
    join public.properties p on p.id = e.id_property
    join public.equipamentos t on t.id = e.id_equipamento
    join public.sistemas s on s.id = t.id_sistema
    left join lateral (
      select r.respuestas_json::jsonb -> 'resumen' as summary
      from public.checklist_response r
      where r.equipo_id = e.id and r.equipamento_id = e.id_equipamento
      order by r.submitted_at desc nulls last, r.id desc
      limit 1
    ) response on true
    where e.estatus is distinct from 'INACTIVO'
      and upper(translate(btrim(s.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
        in ('CLIMATIZACION', 'CLIMATIZACION Y HVAC', 'HVAC')
  ), amounts as (
    select id_property, summary ->> 'estado_operatividad' as state,
      case when jsonb_typeof(summary -> 'puntaje_obtenido') = 'number'
        then (summary ->> 'puntaje_obtenido')::numeric end as earned,
      case when jsonb_typeof(summary -> 'ponderado_total') = 'number'
        then (summary ->> 'ponderado_total')::numeric end as possible
    from latest
  ), asset_scores as (
    select id_property, case
      when state = 'stand_by' then null
      when state = 'inoperativo' then 0
      when possible > 0 and earned between 0 and possible then 100 * earned / possible
    end as score
    from amounts
  )
  select id_property, round(avg(score), 1), count(score)::integer, count(*)::integer
  from asset_scores
  group by id_property;
$$;

revoke execute on function public.get_gema_property_hvac_operability() from public;
grant execute on function public.get_gema_property_hvac_operability() to authenticated;

-- 20261127120000_create_equipment_from_web.sql

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

-- 20261127123000_provider_equipment_findings.sql

create table public.provider_equipment_findings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.equipos(id),
  maintenance_response_id uuid not null unique references public.maintenance_response(id),
  reported_by uuid not null references public.users(id),
  note text not null check (length(btrim(note)) between 1 and 500),
  created_at timestamptz not null default now(),
  corroborating_response_id uuid references public.checklist_response(id) on delete set null
);

alter table public.provider_equipment_findings enable row level security;
grant select on public.provider_equipment_findings to authenticated;

create index provider_equipment_findings_open_asset_idx
on public.provider_equipment_findings (asset_id, created_at desc)
where corroborating_response_id is null;

create policy authorized_equipment_findings on public.provider_equipment_findings
for select to authenticated using (
  (public.get_user_role() in ('TECNICO', 'AUDITOR', 'SUPERVISOR', 'SUPERADMIN')
    or (public.get_user_role() = 'PROVEEDOR' and reported_by = (select auth.uid())))
  and exists (
    select 1 from public.equipos e where e.id = asset_id and public.can_read_property(e.id_property)
  )
);

create function public.report_provider_equipment_finding(p_response_id uuid, p_note text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  report record;
  finding_id uuid;
begin
  if public.get_user_role() is distinct from 'PROVEEDOR' then
    raise exception 'Se requiere un proveedor' using errcode = '42501';
  end if;
  select mr.id as response_id, e.id as asset_id into report
  from public.maintenance_response mr
  join public.mantenimientos m on m.id = mr.id_mantenimiento
  join public.equipos e on e.id = m.id_equipo
  join public.sesion_mantenimiento sm on sm.id = m.id_sesion and sm.id_property = e.id_property
  where mr.id = p_response_id and mr.user_created = (select auth.uid())
    and m.estatus = 'FINALIZADO' and public.can_read_property(e.id_property)
    and e.estatus is distinct from 'INACTIVO';
  if not found then
    raise exception 'El mantenimiento debe estar finalizado y sincronizado por tu cuenta' using errcode = '42501';
  end if;
  insert into public.provider_equipment_findings (asset_id, maintenance_response_id, reported_by, note)
  values (report.asset_id, report.response_id, (select auth.uid()), btrim(p_note))
  on conflict (maintenance_response_id) do update set note = excluded.note
  where provider_equipment_findings.corroborating_response_id is null
  returning id into finding_id;
  if finding_id is null then
    raise exception 'El Técnico ya revisó este hallazgo' using errcode = '23505';
  end if;
  return finding_id;
end;
$$;

create function public.link_provider_finding_to_checklist()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if jsonb_typeof(new.respuestas_json -> 'provider_finding_ids') = 'array'
    and public.get_user_role() = 'TECNICO'
    and new.user_created = (select auth.uid()) then
    update public.provider_equipment_findings f
    set corroborating_response_id = new.id
    where f.asset_id = new.equipo_id and f.corroborating_response_id is null
      and (new.respuestas_json -> 'provider_finding_ids') ? f.id::text
      and f.created_at <= new.submitted_at
      and exists (select 1 from public.equipos e
        where e.id = f.asset_id and public.can_read_property(e.id_property));
  end if;
  return new;
end;
$$;

revoke execute on function public.report_provider_equipment_finding(uuid, text) from public;
revoke execute on function public.link_provider_finding_to_checklist() from public;
grant execute on function public.report_provider_equipment_finding(uuid, text) to authenticated;

create trigger link_provider_finding_to_checklist
after insert on public.checklist_response
for each row execute function public.link_provider_finding_to_checklist();

-- 20261127130000_extraordinary_checklist_assignments.sql

create table public.extraordinary_checklist_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.equipos(id),
  technician_id uuid not null references public.users(id),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index extraordinary_checklist_technician_idx
on public.extraordinary_checklist_assignments (technician_id, end_date);

alter table public.extraordinary_checklist_assignments enable row level security;
grant select on public.extraordinary_checklist_assignments to authenticated;

create policy extraordinary_checklist_read on public.extraordinary_checklist_assignments
for select to authenticated using (
  public.get_user_role() = 'SUPERADMIN'
  or (public.get_user_role() = 'TECNICO' and technician_id = (select auth.uid())
    and exists (
      select 1 from public.equipos e
      where e.id = asset_id and e.estatus is distinct from 'INACTIVO'
        and public.can_read_property(e.id_property)
    ))
);

create function public.assign_extraordinary_checklist(
  p_asset_id uuid, p_technician_id uuid, p_reason text, p_start_date date, p_end_date date
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  property_id uuid;
  assignment_id uuid;
begin
  if public.get_user_role() is distinct from 'SUPERADMIN' then
    raise exception 'Se requiere un Superadmin' using errcode = '42501';
  end if;

  select e.id_property into property_id from public.equipos e
  join public.properties p on p.id = e.id_property and p.is_active
  where e.id = p_asset_id and e.estatus is distinct from 'INACTIVO'
    and e.id_equipamento is not null;

  if property_id is null or not exists (
    select 1 from public.users u where u.id = p_technician_id and u.is_active
      and u.role = 'TECNICO' and public.can_read_property(property_id, u.id)
  ) then
    raise exception 'Selecciona un activo vigente y un Técnico asignado a su inmueble'
      using errcode = '23514';
  end if;

  if p_start_date < (now() at time zone 'America/Lima')::date then
    raise exception 'La inspección debe empezar hoy o después' using errcode = '23514';
  end if;

  insert into public.extraordinary_checklist_assignments
    (asset_id, technician_id, reason, start_date, end_date, created_by)
  values (p_asset_id, p_technician_id, btrim(p_reason), p_start_date, p_end_date, (select auth.uid()))
  returning id into assignment_id;
  return assignment_id;
end;
$$;

revoke execute on function public.assign_extraordinary_checklist(uuid, uuid, text, date, date)
from public, anon;
grant execute on function public.assign_extraordinary_checklist(uuid, uuid, text, date, date)
to authenticated;

create index if not exists equipos_codigo_lower_idx on public.equipos (lower(codigo));

create function public.find_extraordinary_checklist_asset(p_code text)
returns table (id uuid, codigo text, id_property uuid, property_name text)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.codigo, e.id_property, p.name
  from public.equipos e
  join public.properties p on p.id = e.id_property and p.is_active
  where (select public.get_user_role()) = 'SUPERADMIN'
    and lower(e.codigo) = lower(btrim(p_code))
    and e.estatus is distinct from 'INACTIVO'
    and e.id_equipamento is not null
  order by p.name, e.id
$$;

revoke execute on function public.find_extraordinary_checklist_asset(text) from public, anon;
grant execute on function public.find_extraordinary_checklist_asset(text) to authenticated;

alter table public.checklist_response
  add column extraordinary_assignment_id uuid unique
    references public.extraordinary_checklist_assignments(id),
  add constraint checklist_response_extraordinary_type check (
    (extraordinary_assignment_id is not null) = (frequency = 'EXTRAORDINARIA')
    and (extraordinary_assignment_id is null or checklist_schedule_id is null)
  );

drop trigger trg_guard_technician_checklist_schedule on public.checklist_response;
create trigger trg_guard_technician_checklist_schedule
before insert on public.checklist_response
for each row when (new.extraordinary_assignment_id is null)
execute function public.guard_technician_checklist_schedule();

create function public.guard_extraordinary_checklist()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  assignment public.extraordinary_checklist_assignments%rowtype;
begin
  if public.get_user_role() is distinct from 'TECNICO'
    or new.user_created is distinct from (select auth.uid()) then
    raise exception 'Solo el Técnico asignado puede realizar la inspección'
      using errcode = '42501';
  end if;

  select a.* into assignment
  from public.extraordinary_checklist_assignments a
  join public.equipos e on e.id = a.asset_id
  join public.properties p on p.id = e.id_property and p.is_active
  where a.id = new.extraordinary_assignment_id and a.technician_id = new.user_created
    and a.asset_id = new.equipo_id and e.id_equipamento = new.equipamento_id
    and e.estatus is distinct from 'INACTIVO' and public.can_read_property(e.id_property);

  if not found then
    raise exception 'La inspección no corresponde al Técnico o al activo'
      using errcode = '42501';
  end if;
  if new.submitted_at < assignment.created_at
    or new.submitted_at > now() + interval '5 minutes'
    or (new.submitted_at at time zone 'America/Lima')::date not between assignment.start_date and assignment.end_date
    or new.period_start <> assignment.start_date or new.period_end <> assignment.end_date then
    raise exception 'La respuesta está fuera de las fechas asignadas' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_extraordinary_checklist() from public, anon, authenticated;
create trigger trg_guard_extraordinary_checklist
before insert on public.checklist_response
for each row when (new.extraordinary_assignment_id is not null)
execute function public.guard_extraordinary_checklist();

alter policy gema_checklist_response_submit on public.checklist_response with check (
  user_created = (select auth.uid())
  and public.get_user_role() in ('TECNICO', 'AUDITOR', 'SUPERADMIN')
  and exists (
    select 1 from public.equipos e
    where e.id = checklist_response.equipo_id and e.id_equipamento = checklist_response.equipamento_id
      and (public.get_user_role() <> 'TECNICO'
        or checklist_response.extraordinary_assignment_id is not null
        or exists (
          select 1 from public.checklist_schedules cs
          where cs.id = checklist_response.checklist_schedule_id
            and cs.property_id = e.id_property and cs.equipamento_id = e.id_equipamento
        ))
  )
);

create function public.list_open_extraordinary_checklists()
returns table (id uuid, asset_id uuid, start_date date, end_date date, reason text)
language sql stable security invoker set search_path = ''
as $$
  select a.id, a.asset_id, a.start_date, a.end_date, a.reason
  from public.extraordinary_checklist_assignments a
  where a.technician_id = (select auth.uid())
    and a.end_date >= (now() at time zone 'America/Lima')::date
    and not exists (
      select 1 from public.checklist_response r where r.extraordinary_assignment_id = a.id
    )
$$;
revoke execute on function public.list_open_extraordinary_checklists() from public, anon;
grant execute on function public.list_open_extraordinary_checklists() to authenticated;

-- Las inspecciones extraordinarias no consumen las ocurrencias de la regla regular.
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
  v_day_of_week integer;
  v_is_allowed_day boolean := true;
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
  v_day_of_week := extract(isodow from v_local_date)::integer;

  -- 1. Check global exception calendar first
  perform 1
  from public.checklist_workday_exceptions cwe
  where cwe.exception_date = v_local_date
    and cwe.is_working_day = false;

  if found then
    return query
    select true, false,
      'Hoy es un dia no laborable segun el calendario de checklist.',
      v_schedule.id, v_schedule.frequency, v_schedule.occurrences_per_day,
      v_schedule.window_start, v_schedule.window_end, 0,
      null::date, null::date;
    return;
  end if;

  -- 2. Check working days: use schedule-specific work_days if defined, otherwise fallback to global config
  if v_schedule.work_days is not null then
    v_is_allowed_day := v_day_of_week = any(v_schedule.work_days);
  else
    v_is_allowed_day := public.is_checklist_working_day(v_local_date);
  end if;

  if not v_is_allowed_day then
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
      and cr.extraordinary_assignment_id is null
      and cr.submitted_at >= v_period_start_utc
      and cr.submitted_at < v_period_end_utc;
  else
    select count(*)::integer
    into v_current_count
    from public.checklist_response cr
    join public.equipos e on e.id = cr.equipo_id
    where e.id_property = p_property_id
      and e.id_equipamento = p_equipamento_id
      and cr.extraordinary_assignment_id is null
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

notify pgrst, 'reload schema';

commit;

select
  'GEMA: migraciones aplicadas' as resultado,
  (select count(*) from public.users where role = 'TECNICO_REMS') as usuarios_tecnico_rems,
  to_regclass('public.current_checklist_property_templates') is not null as plantillas,
  to_regclass('public.provider_equipment_findings') is not null as hallazgos,
  to_regclass('public.extraordinary_checklist_assignments') is not null as extraordinarios;
