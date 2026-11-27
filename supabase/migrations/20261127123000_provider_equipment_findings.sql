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
