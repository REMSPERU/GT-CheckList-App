ALTER TABLE public.alexperto_document_ai_summaries
  ADD COLUMN IF NOT EXISTS job_id TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_code TEXT,
  ADD COLUMN IF NOT EXISTS failure_detail TEXT,
  ADD COLUMN IF NOT EXISTS response_characters INTEGER,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE TABLE IF NOT EXISTS public.alexperto_document_ai_summary_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES public.alexperto_document_ai_summaries(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL,
  model TEXT NOT NULL,
  response_format TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  duration_ms INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  response_characters INTEGER,
  failure_code TEXT,
  failure_detail TEXT
);

CREATE INDEX IF NOT EXISTS alexperto_document_ai_summary_attempts_summary_idx
  ON public.alexperto_document_ai_summary_attempts (summary_id, started_at DESC);

ALTER TABLE public.alexperto_document_ai_summary_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.alexperto_document_ai_summary_attempts FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.alexperto_document_ai_summary_attempts TO service_role;
