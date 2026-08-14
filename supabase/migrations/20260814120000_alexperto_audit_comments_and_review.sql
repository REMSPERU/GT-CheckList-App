-- Gestión interna separada entre el auditor asignado al inmueble y Paul/SUPERADMIN.
ALTER TABLE public.alexperto_audit_actions
  ADD COLUMN IF NOT EXISTS auditor_comment TEXT,
  ADD COLUMN IF NOT EXISTS paul_comment TEXT;

ALTER TABLE public.alexperto_audit_action_history
  ADD COLUMN IF NOT EXISTS auditor_comment TEXT,
  ADD COLUMN IF NOT EXISTS paul_comment TEXT;

-- Conserva los comentarios registrados antes de separar ambos campos.
UPDATE public.alexperto_audit_actions
SET auditor_comment = notes
WHERE auditor_comment IS NULL AND notes IS NOT NULL;

CREATE OR REPLACE FUNCTION public.save_alexperto_audit_action(
  p_external_entity_id TEXT,
  p_gema_property_id UUID,
  p_status TEXT,
  p_auditor_comment TEXT,
  p_paul_comment TEXT,
  p_updated_by UUID
)
RETURNS public.alexperto_audit_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_status TEXT;
  v_action public.alexperto_audit_actions;
BEGIN
  SELECT current_status
  INTO v_previous_status
  FROM public.alexperto_audit_actions
  WHERE external_entity_type = 'QUOTE'
    AND external_entity_id = p_external_entity_id
  FOR UPDATE;

  INSERT INTO public.alexperto_audit_actions (
    external_entity_type,
    external_entity_id,
    gema_property_id,
    current_status,
    notes,
    auditor_comment,
    paul_comment,
    created_by,
    updated_by
  ) VALUES (
    'QUOTE',
    p_external_entity_id,
    p_gema_property_id,
    p_status,
    p_auditor_comment,
    p_auditor_comment,
    p_paul_comment,
    p_updated_by,
    p_updated_by
  )
  ON CONFLICT (external_entity_type, external_entity_id) DO UPDATE
  SET current_status = EXCLUDED.current_status,
      notes = EXCLUDED.auditor_comment,
      auditor_comment = EXCLUDED.auditor_comment,
      paul_comment = EXCLUDED.paul_comment,
      updated_by = EXCLUDED.updated_by,
      updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_action;

  INSERT INTO public.alexperto_audit_action_history (
    action_id,
    previous_status,
    new_status,
    notes,
    auditor_comment,
    paul_comment,
    created_by
  ) VALUES (
    v_action.id,
    v_previous_status,
    p_status,
    p_auditor_comment,
    p_auditor_comment,
    p_paul_comment,
    p_updated_by
  );

  RETURN v_action;
END;
$$;

REVOKE ALL ON FUNCTION public.save_alexperto_audit_action(TEXT, UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_alexperto_audit_action(TEXT, UUID, TEXT, TEXT, TEXT, UUID) TO service_role;
