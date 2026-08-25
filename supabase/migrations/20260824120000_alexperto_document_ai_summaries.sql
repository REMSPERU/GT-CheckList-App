CREATE TABLE IF NOT EXISTS public.alexperto_document_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  summary_json JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  processing_stage TEXT
    CHECK (processing_stage IN ('EXTRACTING', 'ANALYZING', 'CONSOLIDATING')),
  model TEXT,
  prompt_version TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost NUMERIC(12, 6),
  generation_id TEXT,
  generated_by UUID REFERENCES public.users(id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (request_id, document_id, document_hash)
);

CREATE INDEX IF NOT EXISTS alexperto_document_ai_summaries_document_idx
  ON public.alexperto_document_ai_summaries (request_id, document_id, updated_at DESC);

ALTER TABLE public.alexperto_document_ai_summaries
  ADD COLUMN IF NOT EXISTS processing_stage TEXT
    CHECK (processing_stage IN ('EXTRACTING', 'ANALYZING', 'CONSOLIDATING'));

ALTER TABLE public.alexperto_document_ai_summaries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.alexperto_document_ai_summaries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.alexperto_document_ai_summaries TO service_role;
