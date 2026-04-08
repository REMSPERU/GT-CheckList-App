create table if not exists public.audit_question_sections (
  id uuid primary key default gen_random_uuid(),
  section_name text not null unique,
  order_index integer not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint audit_question_sections_order_positive check (order_index > 0)
);

alter table public.audit_questions
  add column if not exists section_id uuid references public.audit_question_sections(id) on delete restrict;

create index if not exists idx_audit_question_sections_active_order
  on public.audit_question_sections (is_active, order_index);

create index if not exists idx_audit_questions_section_order
  on public.audit_questions (section_id, order_index);

with section_groups as (
  select
    trim(regexp_replace(question_text, '^\s*\[([^\]]+)\].*$', '\1')) as section_name,
    min(order_index) as min_question_order
  from public.audit_questions
  where question_text ~ '^\s*\[[^\]]+\]'
  group by trim(regexp_replace(question_text, '^\s*\[([^\]]+)\].*$', '\1'))
),
ordered_sections as (
  select
    section_name,
    dense_rank() over (order by min_question_order) as section_order
  from section_groups
)
insert into public.audit_question_sections (section_name, order_index)
select section_name, section_order
from ordered_sections
on conflict (section_name)
do update
set
  order_index = excluded.order_index,
  updated_at = timezone('utc', now());

update public.audit_questions aq
set
  section_id = section_row.id,
  question_text = trim(regexp_replace(aq.question_text, '^\s*\[[^\]]+\]\s*', ''))
from public.audit_question_sections section_row
where aq.question_text ~ '^\s*\[[^\]]+\]'
  and section_row.section_name = trim(regexp_replace(aq.question_text, '^\s*\[([^\]]+)\].*$', '\1'));

do $$
begin
  if exists (select 1 from public.audit_questions where section_id is null) then
    raise exception 'Some audit_questions have no section_id after backfill';
  end if;
end
$$;

alter table public.audit_questions
  alter column section_id set not null;

alter table public.audit_question_sections enable row level security;

drop policy if exists audit_question_sections_select on public.audit_question_sections;
create policy audit_question_sections_select
on public.audit_question_sections
for select
to authenticated
using (is_active = true);

drop policy if exists audit_question_sections_admin_write on public.audit_question_sections;
create policy audit_question_sections_admin_write
on public.audit_question_sections
for all
to authenticated
using (public.is_supervisor_or_admin_user())
with check (public.is_supervisor_or_admin_user());

drop trigger if exists trg_touch_audit_question_sections_updated_at on public.audit_question_sections;
create trigger trg_touch_audit_question_sections_updated_at
before update on public.audit_question_sections
for each row
execute function public.touch_audit_updated_at();
