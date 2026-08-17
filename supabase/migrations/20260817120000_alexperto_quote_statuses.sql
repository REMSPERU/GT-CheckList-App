-- Solo se exponen los cuatro estados operativos de cotizaciones en GEMA.
UPDATE public.alexperto_audit_actions
SET current_status = 'PENDIENTE_REVISION'
WHERE current_status = 'PENDIENTE_VALIDACION';

ALTER TABLE public.alexperto_audit_actions
  DROP CONSTRAINT IF EXISTS alexperto_audit_actions_current_status_check;

ALTER TABLE public.alexperto_audit_actions
  ADD CONSTRAINT alexperto_audit_actions_current_status_check
  CHECK (current_status IN (
    'PENDIENTE_REVISION',
    'OBSERVADO',
    'CULMINADO',
    'VALIDADO'
  ));

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
  IF p_status NOT IN (
    'PENDIENTE_REVISION',
    'OBSERVADO',
    'CULMINADO',
    'VALIDADO'
  ) THEN
    RAISE EXCEPTION 'Estado de cotización no válido';
  END IF;

  SELECT current_status
  INTO v_previous_status
  FROM public.alexperto_audit_actions
  WHERE external_entity_type = 'QUOTE'
    AND external_entity_id = p_external_entity_id
  FOR UPDATE;

  INSERT INTO public.alexperto_audit_actions (
    external_entity_type, external_entity_id, gema_property_id, current_status,
    notes, auditor_comment, paul_comment, created_by, updated_by
  ) VALUES (
    'QUOTE', p_external_entity_id, p_gema_property_id, p_status,
    p_auditor_comment, p_auditor_comment, p_paul_comment, p_updated_by,
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

  -- Se registra cada guardado, incluso cuando solo cambia un comentario.
  INSERT INTO public.alexperto_audit_action_history (
    action_id, previous_status, new_status, notes, auditor_comment,
    paul_comment, created_by
  ) VALUES (
    v_action.id, v_previous_status, p_status, p_auditor_comment,
    p_auditor_comment, p_paul_comment, p_updated_by
  );

  RETURN v_action;
END;
$$;
