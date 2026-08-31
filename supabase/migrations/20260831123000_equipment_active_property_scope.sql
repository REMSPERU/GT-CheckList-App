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
    and u.role in ('AUDITOR', 'SUPERADMIN', 'SUPERVISOR', 'TECNICO', 'TECNICO_REMS')
    and p.is_active = true
  order by p.name asc;
$$;

grant execute on function public.list_equipment_active_properties() to authenticated;
