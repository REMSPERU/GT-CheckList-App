-- El despacho controla la visibilidad de una cotización para los auditores.
-- Se mantiene separado del estado de revisión GEMA.
ALTER TABLE public.alexperto_audit_actions
  ADD COLUMN IF NOT EXISTS auditor_dispatch_status TEXT NOT NULL DEFAULT 'PENDIENTE_ENVIO',
  ADD COLUMN IF NOT EXISTS auditor_dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auditor_dispatched_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.alexperto_audit_actions
  DROP CONSTRAINT IF EXISTS alexperto_audit_actions_auditor_dispatch_status_check;

ALTER TABLE public.alexperto_audit_actions
  ADD CONSTRAINT alexperto_audit_actions_auditor_dispatch_status_check
  CHECK (auditor_dispatch_status IN ('PENDIENTE_ENVIO', 'ENVIADO', 'RETIRADO'));

CREATE INDEX IF NOT EXISTS alexperto_audit_actions_quote_dispatch_idx
  ON public.alexperto_audit_actions (
    gema_property_id,
    external_entity_id,
    auditor_dispatch_status
  )
  WHERE external_entity_type = 'QUOTE';

CREATE OR REPLACE FUNCTION public.set_alexperto_quote_auditor_dispatch(
  p_external_entity_id TEXT,
  p_gema_property_id UUID,
  p_dispatch_status TEXT,
  p_updated_by UUID
)
RETURNS public.alexperto_audit_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action public.alexperto_audit_actions;
BEGIN
  IF p_dispatch_status NOT IN ('ENVIADO', 'RETIRADO') THEN
    RAISE EXCEPTION 'Estado de despacho no válido';
  END IF;

  INSERT INTO public.alexperto_audit_actions (
    external_entity_type,
    external_entity_id,
    gema_property_id,
    current_status,
    auditor_dispatch_status,
    auditor_dispatched_at,
    auditor_dispatched_by,
    created_by,
    updated_by
  ) VALUES (
    'QUOTE',
    p_external_entity_id,
    p_gema_property_id,
    'PENDIENTE_REVISION',
    p_dispatch_status,
    CASE WHEN p_dispatch_status = 'ENVIADO' THEN timezone('utc'::text, now()) END,
    CASE WHEN p_dispatch_status = 'ENVIADO' THEN p_updated_by END,
    p_updated_by,
    p_updated_by
  ) ON CONFLICT (external_entity_type, external_entity_id) DO UPDATE
  SET auditor_dispatch_status = EXCLUDED.auditor_dispatch_status,
      auditor_dispatched_at = CASE
        WHEN EXCLUDED.auditor_dispatch_status = 'ENVIADO'
          THEN timezone('utc'::text, now())
        ELSE NULL
      END,
      auditor_dispatched_by = CASE
        WHEN EXCLUDED.auditor_dispatch_status = 'ENVIADO'
          THEN EXCLUDED.updated_by
        ELSE NULL
      END,
      updated_by = EXCLUDED.updated_by,
      updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_action;

  RETURN v_action;
END;
$$;

REVOKE ALL ON FUNCTION public.set_alexperto_quote_auditor_dispatch(TEXT, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_alexperto_quote_auditor_dispatch(TEXT, UUID, TEXT, UUID) TO service_role;
