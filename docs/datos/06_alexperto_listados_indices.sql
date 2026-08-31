-- Optimiza los listados web de cotizaciones y solicitudes de Alexperto.
-- Ejecutar UNA VEZ por un administrador de la base externa de Alexperto.
-- CREATE INDEX CONCURRENTLY no puede ejecutarse dentro de una transaccion.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_property_created_at
  ON sch_main.quotes (property_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_generated_request_id
  ON sch_main.quotes (generated_request_id)
  WHERE generated_request_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_trigger_request_id
  ON sch_main.quotes (trigger_request_id)
  WHERE trigger_request_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_quote_latest
  ON sch_main.proposals (quote_id, updated_at DESC, created_at DESC)
  INCLUDE (cost, latest_proposal_status, provider_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_property_start_time_active
  ON sch_main.requests (property_id, start_time DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_property_created_at_active
  ON sch_main.requests (property_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_documents_request_active
  ON sch_main.request_documents (request_id)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quote_documents_quote_active
  ON sch_main.quote_documents (quote_id)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposal_documents_proposal_active
  ON sch_main.proposal_documents (proposal_id)
  WHERE deleted_at IS NULL;
