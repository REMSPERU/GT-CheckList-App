-- Migration: relax_audit_payload_photos_constraint
--
-- Problem: The validate_audit_payload function required that every OBS answer
-- has at least one photo. This blocks any UPDATE on audit_sessions whenever the
-- payload contains an OBS answer without photos (e.g. older records from the
-- mobile app that allowed saving OBS without a photo). The admin web panel
-- cannot edit ANY answer in such a session because the constraint re-validates
-- the entire payload on every write.
--
-- Fix: Remove the photo-array requirement for OBS answers. Only the comment
-- being non-empty is enforced. Structural rules (answers is an array, each
-- item is an object with question_id + status, status in OK/OBS) are kept.

create or replace function public.validate_audit_payload(p_payload jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  answer_item  jsonb;
  answer_status text;
  answer_comment text;
  answer_photos  jsonb;
begin
  if p_payload is null then
    return true;
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    return false;
  end if;

  -- 'answers' key must exist and be an array
  if not (p_payload ? 'answers') then
    return false;
  end if;

  if jsonb_typeof(p_payload -> 'answers') <> 'array' then
    return false;
  end if;

  for answer_item in
    select value from jsonb_array_elements(p_payload -> 'answers')
  loop
    if jsonb_typeof(answer_item) <> 'object' then
      return false;
    end if;

    if not (answer_item ? 'question_id' and answer_item ? 'status') then
      return false;
    end if;

    answer_status := answer_item ->> 'status';
    if answer_status not in ('OK', 'OBS') then
      return false;
    end if;

    -- OBS must have a non-empty comment (photos are optional for admin edits)
    if answer_status = 'OBS' then
      answer_comment := nullif(trim(coalesce(answer_item ->> 'comment', '')), '');
      if answer_comment is null then
        return false;
      end if;

      -- photos field, if present, must be an array (but can be empty)
      answer_photos := answer_item -> 'photos';
      if answer_photos is not null
        and jsonb_typeof(answer_photos) <> 'array' then
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

-- Re-apply the constraint so it picks up the updated function definition.
-- The function is IMMUTABLE so Postgres may cache the old plan; dropping and
-- re-adding forces the constraint to use the new version.
alter table public.audit_sessions
  drop constraint if exists audit_sessions_payload_valid_check;

alter table public.audit_sessions
  add constraint audit_sessions_payload_valid_check
  check (public.validate_audit_payload(audit_payload));
