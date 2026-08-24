-- Actualiza instalaciones donde la tabla se creó antes del progreso por etapas.
ALTER TABLE public.alexperto_document_ai_summaries
  ADD COLUMN IF NOT EXISTS processing_stage TEXT
    CHECK (processing_stage IN ('EXTRACTING', 'ANALYZING', 'CONSOLIDATING'));
