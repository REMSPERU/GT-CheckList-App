create table if not exists public.progress_viewers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  public_token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint progress_viewers_name_check check (length(trim(display_name)) > 0)
);

create table if not exists public.progress_projects (
  id uuid primary key default gen_random_uuid(),
  sequence_number integer not null,
  name text not null,
  project_type text not null,
  property_id uuid references public.properties(id) on delete set null,
  assigned_viewer_id uuid references public.progress_viewers(id) on delete set null,
  manager_name text,
  observations text,
  current_progress smallint not null default 0,
  current_status text not null default 'PLANIFICACION',
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint progress_projects_progress_check check (current_progress between 0 and 100),
  constraint progress_projects_status_check check (current_status in ('PLANIFICACION', 'EN_CURSO', 'PAUSADO', 'RETRASADO', 'COMPLETADO')),
  constraint progress_projects_name_check check (length(trim(name)) > 0)
);

create table if not exists public.progress_project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.progress_projects(id) on delete cascade,
  stage_key text not null,
  stage_label text not null,
  stage_group text not null,
  position smallint not null,
  is_completed boolean not null default false,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, stage_key),
  constraint progress_stages_position_check check (position between 1 and 10),
  constraint progress_stages_group_check check (stage_group in ('GESTION_TECNICA', 'ADMINISTRACION'))
);

create table if not exists public.progress_project_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.progress_projects(id) on delete cascade,
  event_type text not null,
  previous_value jsonb,
  new_value jsonb,
  comment text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists progress_viewers_token_idx on public.progress_viewers(public_token);
create index if not exists progress_projects_viewer_active_idx on public.progress_projects(assigned_viewer_id, is_active);
create index if not exists progress_stages_project_position_idx on public.progress_project_stages(project_id, position);
create index if not exists progress_history_project_date_idx on public.progress_project_history(project_id, created_at desc);

create or replace function public.progress_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end; $$;

drop trigger if exists progress_viewers_updated_at on public.progress_viewers;
create trigger progress_viewers_updated_at before update on public.progress_viewers for each row execute function public.progress_set_updated_at();
drop trigger if exists progress_projects_updated_at on public.progress_projects;
create trigger progress_projects_updated_at before update on public.progress_projects for each row execute function public.progress_set_updated_at();
drop trigger if exists progress_stages_updated_at on public.progress_project_stages;
create trigger progress_stages_updated_at before update on public.progress_project_stages for each row execute function public.progress_set_updated_at();

create or replace function public.progress_recalculate_project() returns trigger language plpgsql as $$
declare completed_count integer;
begin
  select count(*) filter (where is_completed) into completed_count from public.progress_project_stages where project_id = coalesce(new.project_id, old.project_id);
  update public.progress_projects set current_progress = completed_count * 10,
    current_status = case when completed_count = 10 then 'COMPLETADO' else current_status end,
    updated_by = coalesce(new.updated_by, updated_by)
    where id = coalesce(new.project_id, old.project_id);
  return coalesce(new, old);
end; $$;
drop trigger if exists progress_stages_recalculate on public.progress_project_stages;
create trigger progress_stages_recalculate after insert or update of is_completed or delete on public.progress_project_stages for each row execute function public.progress_recalculate_project();

create or replace function public.progress_history_trigger() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into public.progress_project_history(project_id,event_type,new_value,created_by) values (new.id,'PROJECT_CREATED',to_jsonb(new),new.created_by); return new;
  elsif tg_op = 'UPDATE' then
    insert into public.progress_project_history(project_id,event_type,previous_value,new_value,created_by)
      values (new.id,'PROJECT_UPDATED',to_jsonb(old),to_jsonb(new),new.updated_by); return new;
  end if;
  return new;
end; $$;
drop trigger if exists progress_projects_history on public.progress_projects;
create trigger progress_projects_history after insert or update on public.progress_projects for each row execute function public.progress_history_trigger();

create or replace function public.progress_stage_history_trigger() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.is_completed is distinct from new.is_completed then
    insert into public.progress_project_history(project_id, event_type, previous_value, new_value, created_by)
      values (new.project_id, 'STAGE_UPDATED', jsonb_build_object('stage_key', old.stage_key, 'is_completed', old.is_completed), jsonb_build_object('stage_key', new.stage_key, 'is_completed', new.is_completed), new.updated_by);
  end if;
  return new;
end; $$;
drop trigger if exists progress_stages_history on public.progress_project_stages;
create trigger progress_stages_history after update of is_completed on public.progress_project_stages for each row execute function public.progress_stage_history_trigger();

alter table public.progress_viewers enable row level security;
alter table public.progress_projects enable row level security;
alter table public.progress_project_stages enable row level security;
alter table public.progress_project_history enable row level security;
create policy progress_viewers_superadmin on public.progress_viewers for all to authenticated using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active)) with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active));
create policy progress_projects_superadmin on public.progress_projects for all to authenticated using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active)) with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active));
create policy progress_stages_superadmin on public.progress_project_stages for all to authenticated using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active)) with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active));
create policy progress_history_superadmin on public.progress_project_history for all to authenticated using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active));
grant all on public.progress_viewers, public.progress_projects, public.progress_project_stages, public.progress_project_history to service_role;
