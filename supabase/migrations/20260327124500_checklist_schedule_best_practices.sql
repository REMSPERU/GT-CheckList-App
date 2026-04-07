alter table public.checklist_schedules
  drop constraint if exists checklist_schedules_property_id_fkey,
  drop constraint if exists checklist_schedules_equipamento_id_fkey;
alter table public.checklist_schedules
  add constraint checklist_schedules_property_id_fkey
    foreign key (property_id)
    references public.properties(id)
    on delete cascade
    not valid,
  add constraint checklist_schedules_equipamento_id_fkey
    foreign key (equipamento_id)
    references public.equipamentos(id)
    on delete cascade
    not valid;
alter table public.checklist_schedules
  validate constraint checklist_schedules_property_id_fkey;
alter table public.checklist_schedules
  validate constraint checklist_schedules_equipamento_id_fkey;
drop index if exists public.idx_checklist_schedules_active;
create index if not exists idx_equipos_scope_lookup
  on public.equipos (id_property, id_equipamento, id);
