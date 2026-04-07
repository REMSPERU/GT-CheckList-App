alter table public.checklist_response
  add column if not exists client_submission_id uuid;
update public.checklist_response
set client_submission_id = gen_random_uuid()
where client_submission_id is null;
alter table public.checklist_response
  alter column client_submission_id set not null,
  alter column client_submission_id set default gen_random_uuid();
create unique index if not exists idx_checklist_response_client_submission_id
  on public.checklist_response (client_submission_id);
create index if not exists idx_checklist_response_schedule_submitted_at
  on public.checklist_response (checklist_schedule_id, submitted_at desc);
alter table public.checklist_response
  add constraint checklist_response_totals_non_negative
  check (
    total_questions >= 0
    and total_ok >= 0
    and total_observed >= 0
    and total_photos >= 0
  ) not valid;
alter table public.checklist_response
  validate constraint checklist_response_totals_non_negative;
