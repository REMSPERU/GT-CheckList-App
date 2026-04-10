-- Restrict property visibility only for AUDITOR users.
-- Other roles keep global visibility over properties.

create or replace function public.can_read_property(
  p_property_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_user_id is null then false
    when public.is_auditor_user(p_user_id)
      then public.has_audit_property_assignment(p_property_id, p_user_id)
    else true
  end;
$$;

grant execute on function public.can_read_property(uuid, uuid) to authenticated;

alter table public.properties enable row level security;

drop policy if exists properties_select on public.properties;
create policy properties_select
on public.properties
for select
to authenticated
using (public.can_read_property(id, (select auth.uid())));

create or replace view public.v_user_property_assignments
with (security_invoker = true)
as
select
  u.id as user_id,
  u.email,
  u.role,
  p.id as property_id,
  p.code as property_code,
  p.name as property_name,
  up.property_role,
  up.assigned_at,
  up.expires_at,
  case
    when up.user_id is null then 'SIN_ASIGNACION'
    when up.expires_at is not null and up.expires_at <= now() then 'VENCIDA'
    else 'ACTIVA'
  end as assignment_status
from public.users u
left join public.user_properties up
  on up.user_id = u.id
left join public.properties p
  on p.id = up.property_id
where
  public.is_supervisor_or_admin_user()
  or u.id = auth.uid();

grant select on public.v_user_property_assignments to authenticated;
