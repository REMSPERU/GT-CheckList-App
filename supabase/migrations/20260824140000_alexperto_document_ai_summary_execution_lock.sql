ALTER TABLE public.alexperto_document_ai_summaries
  ADD COLUMN IF NOT EXISTS execution_id UUID;

CREATE OR REPLACE FUNCTION public.claim_alexperto_document_ai_summary(
  p_request_id TEXT,
  p_document_id TEXT,
  p_document_hash TEXT,
  p_generated_by UUID,
  p_prompt_version TEXT,
  p_regenerate BOOLEAN
)
RETURNS TABLE (claimed BOOLEAN, execution_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution_id UUID := gen_random_uuid();
  v_status TEXT;
  v_current_execution_id UUID;
BEGIN
  INSERT INTO public.alexperto_document_ai_summaries (
    request_id, document_id, document_hash, status, processing_stage,
    generated_by, prompt_version, execution_id
  ) VALUES (
    p_request_id, p_document_id, p_document_hash, 'PROCESSING', 'EXTRACTING',
    p_generated_by, p_prompt_version, v_execution_id
  ) ON CONFLICT (request_id, document_id, document_hash) DO NOTHING;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, v_execution_id;
    RETURN;
  END IF;

  SELECT status, execution_id INTO v_status, v_current_execution_id
  FROM public.alexperto_document_ai_summaries
  WHERE request_id = p_request_id
    AND document_id = p_document_id
    AND document_hash = p_document_hash
  FOR UPDATE;

  IF (v_status = 'PROCESSING' AND v_current_execution_id IS NOT NULL)
    OR (v_status = 'COMPLETED' AND NOT p_regenerate) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID;
    RETURN;
  END IF;

  UPDATE public.alexperto_document_ai_summaries
  SET status = 'PROCESSING', processing_stage = 'EXTRACTING',
      generated_by = p_generated_by, prompt_version = p_prompt_version,
      execution_id = v_execution_id, error_message = NULL,
      updated_at = timezone('utc'::text, now())
  WHERE request_id = p_request_id
    AND document_id = p_document_id
    AND document_hash = p_document_hash;

  RETURN QUERY SELECT TRUE, v_execution_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_alexperto_document_ai_summary(TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_alexperto_document_ai_summary(TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN) TO service_role;
