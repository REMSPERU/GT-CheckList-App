begin;
set local lock_timeout = '3s';

alter policy gema_equipos_read on public.equipos using (
  case
    when (select public.get_user_role()) in ('SUPERADMIN', 'SUPERVISOR')
      then (select public.can_read_property(null::uuid))
    when (select public.get_user_role()) in ('TECNICO', 'AUDITOR', 'PROVEEDOR')
      then public.can_read_property(id_property, (select auth.uid()))
    else false
  end
);

commit;
