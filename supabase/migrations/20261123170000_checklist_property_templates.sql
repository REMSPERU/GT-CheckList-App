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
