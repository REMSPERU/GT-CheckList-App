import 'server-only';

import { createHash } from 'node:crypto';

import { technicalReportSummarySchema } from '@/schemas/alexperto.schema';
import { createServiceRoleSupabaseClient } from '@/services/auth/server-auth.service';
import type {
  TechnicalReportSummary,
  TechnicalReportSummaryResponse,
} from '@/types/alexperto';

import {
  downloadAlexpertoDocument,
  getAlexpertoTechnicalDocument,
} from './alexperto-documents.service';
import {
  extractPdfText,
  formatPdfPages,
  splitPdfPages,
} from './pdf-text-extractor.service';

const PROMPT_VERSION = 'technical-report-v5-findings';
const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_INPUT_CHARS = 80_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 900;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

interface SummaryRow {
  id: string;
  status: TechnicalReportSummaryResponse['status'];
  summary_json: unknown;
  model: string | null;
  updated_at: string;
  error_message: string | null;
  processing_stage: TechnicalReportSummaryResponse['processingStage'];
  execution_id: string | null;
  attempt_count: number | null;
}

interface OpenRouterResult {
  summary: TechnicalReportSummary;
  inputTokens: number | null;
  outputTokens: number | null;
  generationId: string | null;
  responseCharacters: number;
}

class AnalysisError extends Error {
  constructor(
    readonly code: string,
    readonly detail: string | null = null,
    readonly providerFailure = false,
  ) {
    super(code);
  }
}

function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) throw new AnalysisError('OPENROUTER_NOT_CONFIGURED');
  return {
    apiKey,
    model,
    fallbackModels: [
      process.env.OPENROUTER_FALLBACK_MODEL,
      ...(process.env.OPENROUTER_FALLBACK_MODELS?.split(',') ?? []),
    ]
      .map(candidate => candidate?.trim())
      .filter((candidate): candidate is string => Boolean(candidate))
      .filter(candidate => candidate !== model),
    maxInputChars: getNumberEnv(
      'OPENROUTER_MAX_INPUT_CHARS',
      DEFAULT_MAX_INPUT_CHARS,
    ),
    maxOutputTokens: getNumberEnv(
      'OPENROUTER_MAX_OUTPUT_TOKENS',
      DEFAULT_MAX_OUTPUT_TOKENS,
    ),
    requestTimeoutMs: getNumberEnv(
      'OPENROUTER_REQUEST_TIMEOUT_MS',
      DEFAULT_REQUEST_TIMEOUT_MS,
    ),
    temperature: Number(process.env.OPENROUTER_TEMPERATURE ?? 0.1),
  };
}

function systemPrompt() {
  return 'Eres un analista de informes técnicos de mantenimiento. Usa exclusivamente la información entregada. No inventes equipos, ubicaciones, páginas, evidencias ni datos técnicos. Cada hallazgo debe citar la página exacta donde aparece. Prioriza seguridad, continuidad operativa y riesgo de daño. Un equipo inoperativo, fuera de servicio o con falla que impida operar siempre es criticidad ALTA y debe indicarse explícitamente. La criticidad es una estimación: ALTA para riesgos a personas, incendio, falla inminente, equipo inoperativo o daño mayor; MEDIA para deficiencias relevantes que pueden escalar. Omite mejoras menores y buenas prácticas.';
}

function outputInstructions(pageCount: number) {
  return `Responde EN ESPAÑOL y comienza exactamente con \"## Hallazgos\". Incluye máximo cuatro hallazgos importantes. No incluyas resumen ejecutivo, impacto, acciones, recomendaciones, limitaciones ni texto introductorio. Cada hallazgo debe usar \"### ALTA | Página N | Título\" o \"### MEDIA | Página N | Título\", seguido de una sola línea \"Evidencia: ...\". No uses la palabra \"criticidad\". Si un equipo está inoperativo o fuera de servicio, debe ser ALTA y el título debe empezar con \"INOPERATIVO:\". Usa frases breves. La página debe ser un entero entre 1 y ${pageCount}.`;
}

function isProviderFailure(error: unknown) {
  return error instanceof AnalysisError && error.providerFailure;
}

async function recordAttempt(
  summaryId: string,
  executionId: string,
  model: string,
  responseFormat: string,
  startedAt: number,
  result?: OpenRouterResult,
  error?: unknown,
) {
  const failure = error instanceof AnalysisError ? error : null;
  const durationMs = Date.now() - startedAt;
  const supabase = createServiceRoleSupabaseClient();
  const { error: insertError } = await supabase
    .from('alexperto_document_ai_summary_attempts')
    .insert({
      summary_id: summaryId,
      execution_id: executionId,
      model,
      response_format: responseFormat,
      duration_ms: durationMs,
      input_tokens: result?.inputTokens ?? null,
      output_tokens: result?.outputTokens ?? null,
      response_characters: result?.responseCharacters ?? null,
      failure_code: failure?.code ?? (error ? 'ANALYSIS_FAILED' : null),
      failure_detail: failure?.detail ?? null,
    });
  if (insertError)
    console.error('Technical report attempt audit failed', {
      code: insertError.code,
    });
}

async function callOpenRouter(
  content: string,
  pageCount: number,
  model: string,
  config: ReturnType<typeof getOpenRouterConfig>,
  summaryId: string,
  executionId: string,
  retryForFormat = false,
): Promise<OpenRouterResult> {
  const startedAt = Date.now();
  const responseFormat = 'text';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: Number.isFinite(config.temperature)
            ? config.temperature
            : 0.1,
          max_tokens: config.maxOutputTokens,
          reasoning: { exclude: true },
          messages: [
            { role: 'system', content: systemPrompt() },
            {
              role: 'user',
              content: `${outputInstructions(pageCount)}${retryForFormat ? '\n\nLa respuesta anterior no cumplió el formato. Entrega directamente el resultado final; la primera línea debe ser exactamente ## Hallazgos.' : ''}\n\n${content}`,
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      const providerFailure =
        response.status === 429 ||
        response.status >= 500 ||
        response.status === 408;
      throw new AnalysisError(
        `OPENROUTER_HTTP_${response.status}`,
        null,
        providerFailure,
      );
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      id?: string;
    };
    const contentResult = payload.choices?.[0]?.message?.content;
    if (!contentResult?.trim())
      throw new AnalysisError(
        'OPENROUTER_EMPTY_RESPONSE',
        'El modelo no devolvió contenido.',
        true,
      );
    const summaryMarkdown = contentResult.trim();
    if (!summaryMarkdown.startsWith('## Hallazgos')) {
      throw new AnalysisError(
        'OPENROUTER_INVALID_FORMAT',
        'El modelo devolvió razonamiento en lugar del resultado final.',
      );
    }
    const result = {
      summary: { markdown: summaryMarkdown },
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
      generationId: payload.id ?? null,
      responseCharacters: contentResult.length,
    };
    await recordAttempt(
      summaryId,
      executionId,
      model,
      responseFormat,
      startedAt,
      result,
    );
    console.info('Technical report AI attempt completed', {
      model,
      responseFormat,
      durationMs: Date.now() - startedAt,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      responseCharacters: result.responseCharacters,
    });
    return result;
  } catch (error) {
    const normalized =
      error instanceof DOMException && error.name === 'AbortError'
        ? new AnalysisError('OPENROUTER_TIMEOUT', null, true)
        : error;
    await recordAttempt(
      summaryId,
      executionId,
      model,
      responseFormat,
      startedAt,
      undefined,
      normalized,
    );
    console.info('Technical report AI attempt failed', {
      model,
      responseFormat,
      durationMs: Date.now() - startedAt,
      code:
        normalized instanceof AnalysisError
          ? normalized.code
          : 'ANALYSIS_FAILED',
    });
    throw normalized;
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWithFallback(
  content: string,
  pageCount: number,
  config: ReturnType<typeof getOpenRouterConfig>,
  summaryId: string,
  executionId: string,
) {
  const models = [...new Set([config.model, ...config.fallbackModels])];
  console.info('Technical report AI models queued', { models });

  async function analyzeModel(model: string) {
    try {
      return await callOpenRouter(
        content,
        pageCount,
        model,
        config,
        summaryId,
        executionId,
      );
    } catch (error) {
      if (
        error instanceof AnalysisError &&
        error.code === 'OPENROUTER_INVALID_FORMAT'
      ) {
        return callOpenRouter(
          content,
          pageCount,
          model,
          config,
          summaryId,
          executionId,
          true,
        );
      }
      throw error;
    }
  }

  let lastProviderError: unknown;
  for (const model of models) {
    try {
      return { ...(await analyzeModel(model)), model };
    } catch (error) {
      if (!isProviderFailure(error)) throw error;
      lastProviderError = error;
    }
  }
  throw lastProviderError;
}

function formatPartialSummaries(summaries: TechnicalReportSummary[]) {
  return summaries
    .map((summary, index) => {
      const markdown =
        'markdown' in summary
          ? summary.markdown
          : `${summary.executiveSummary}\n\n${summary.findings.map(finding => `### ${finding.criticality} | Página ${finding.page} | ${finding.title}\n- Evidencia: ${finding.evidence}\n- Impacto: ${finding.impact}\n- Recomendación: ${finding.recommendation}`).join('\n\n')}`;
      return `## Lote ${index + 1}\n${markdown}`;
    })
    .join('\n');
}

function responseFromRow(
  row: SummaryRow | null | undefined,
): TechnicalReportSummaryResponse {
  if (!row)
    return {
      status: 'NOT_ANALYZED',
      summary: null,
      model: null,
      analyzedAt: null,
      errorMessage: null,
      processingStage: null,
      attemptCount: 0,
    };
  return {
    status: row.status,
    summary:
      row.status === 'COMPLETED'
        ? technicalReportSummarySchema.parse(row.summary_json)
        : null,
    model: row.model,
    analyzedAt: row.updated_at,
    errorMessage: row.error_message,
    processingStage: row.processing_stage,
    attemptCount: row.attempt_count ?? 0,
  };
}

async function findSummary(
  requestId: string,
  documentId: string,
  hash?: string,
) {
  let query = createServiceRoleSupabaseClient()
    .from('alexperto_document_ai_summaries')
    .select(
      'id, status, summary_json, model, updated_at, error_message, processing_stage, execution_id, attempt_count',
    )
    .eq('request_id', requestId)
    .eq('document_id', documentId)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (hash) query = query.eq('document_hash', hash);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as SummaryRow | null;
}

export async function getTechnicalReportSummary(
  requestId: string,
  documentId: string,
) {
  return responseFromRow(await findSummary(requestId, documentId));
}

function safeFailureMessage(error: unknown) {
  if (error instanceof AnalysisError) {
    if (error.code === 'OPENROUTER_EMPTY_RESPONSE')
      return 'El modelo no devolvió un resultado.';
    if (error.providerFailure) return 'El proveedor no estuvo disponible.';
  }
  return 'No se pudo completar el análisis del informe.';
}

export async function generateTechnicalReportSummary(
  requestId: string,
  documentId: string,
  generatedBy: string,
  regenerate: boolean,
) {
  const document = await getAlexpertoTechnicalDocument(requestId, documentId);
  if (!document || document.mimeType?.toLowerCase() !== 'application/pdf')
    throw new Error('DOCUMENT_NOT_ALLOWED');
  const config = getOpenRouterConfig();
  const bytes = await downloadAlexpertoDocument(
    document.path,
    getNumberEnv('OPENROUTER_MAX_PDF_BYTES', DEFAULT_MAX_PDF_BYTES),
  );
  const hash = createHash('sha256').update(bytes).digest('hex');
  const existing = await findSummary(requestId, documentId, hash);
  if (existing?.status === 'COMPLETED' && !regenerate)
    return responseFromRow(existing);
  const supabase = createServiceRoleSupabaseClient();
  const { data: claim, error: claimError } = await supabase.rpc(
    'claim_alexperto_document_ai_summary',
    {
      p_request_id: requestId,
      p_document_id: documentId,
      p_document_hash: hash,
      p_generated_by: generatedBy,
      p_prompt_version: PROMPT_VERSION,
      p_regenerate: regenerate,
    },
  );
  if (claimError) throw claimError;
  const claimRow = claim?.[0] as
    { claimed?: boolean; execution_id?: string | null } | undefined;
  if (!claimRow?.claimed || !claimRow.execution_id)
    return responseFromRow(await findSummary(requestId, documentId, hash));
  const executionId = claimRow.execution_id;
  const claimedSummary = await findSummary(requestId, documentId, hash);
  if (!claimedSummary) throw new Error('ANALYSIS_NOT_FOUND');
  try {
    const pages = await extractPdfText(
      bytes,
      getNumberEnv('OPENROUTER_MAX_PDF_PAGES', DEFAULT_MAX_PAGES),
    );
    const batches = splitPdfPages(pages, config.maxInputChars);
    await setProcessingStage(
      supabase,
      requestId,
      documentId,
      hash,
      executionId,
      'ANALYZING',
    );
    const batchResults = [];
    for (const batch of batches)
      batchResults.push(
        await analyzeWithFallback(
          formatPdfPages(batch, document.name),
          pages.length,
          config,
          claimedSummary.id,
          executionId,
        ),
      );
    const analysis =
      batchResults.length === 1
        ? batchResults[0]
        : await (async () => {
            await setProcessingStage(
              supabase,
              requestId,
              documentId,
              hash,
              executionId,
              'CONSOLIDATING',
            );
            return analyzeWithFallback(
              `Consolida los hallazgos parciales siguientes. Elimina duplicados, conserva solamente páginas originales verificables y no inventes información.\n\n${formatPartialSummaries(batchResults.map(result => result.summary))}`,
              pages.length,
              config,
              claimedSummary.id,
              executionId,
            );
          })();
    const { data, error } = await supabase
      .from('alexperto_document_ai_summaries')
      .update({
        status: 'COMPLETED',
        processing_stage: null,
        summary_json: analysis.summary,
        model: analysis.model,
        input_tokens: analysis.inputTokens,
        output_tokens: analysis.outputTokens,
        generation_id: analysis.generationId,
        response_characters: analysis.responseCharacters,
        duration_ms: Date.now() - new Date(claimedSummary.updated_at).getTime(),
        error_message: null,
        failure_code: null,
        failure_detail: null,
        updated_at: new Date().toISOString(),
      })
      .eq('request_id', requestId)
      .eq('document_id', documentId)
      .eq('document_hash', hash)
      .eq('execution_id', executionId)
      .select('execution_id');
    if (error) throw error;
    if (!data?.length) throw new Error('ANALYSIS_SUPERSEDED');
    const { count } = await supabase
      .from('alexperto_document_ai_summary_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('summary_id', claimedSummary.id);
    await supabase
      .from('alexperto_document_ai_summaries')
      .update({
        attempt_count: count ?? 0,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', claimedSummary.id)
      .eq('execution_id', executionId);
    return responseFromRow(await findSummary(requestId, documentId, hash));
  } catch (error) {
    const code =
      error instanceof AnalysisError ? error.code : 'ANALYSIS_FAILED';
    const { count } = await supabase
      .from('alexperto_document_ai_summary_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('summary_id', claimedSummary.id);
    await supabase
      .from('alexperto_document_ai_summaries')
      .update({
        status: 'FAILED',
        processing_stage: null,
        attempt_count: count ?? 0,
        last_attempt_at: new Date().toISOString(),
        error_message: safeFailureMessage(error),
        failure_code: code,
        failure_detail: error instanceof AnalysisError ? error.detail : null,
        updated_at: new Date().toISOString(),
      })
      .eq('request_id', requestId)
      .eq('document_id', documentId)
      .eq('document_hash', hash)
      .eq('execution_id', executionId);
    throw error;
  }
}

async function setProcessingStage(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  requestId: string,
  documentId: string,
  hash: string,
  executionId: string,
  processingStage: NonNullable<
    TechnicalReportSummaryResponse['processingStage']
  >,
) {
  const { data, error } = await supabase
    .from('alexperto_document_ai_summaries')
    .update({
      processing_stage: processingStage,
      updated_at: new Date().toISOString(),
    })
    .eq('request_id', requestId)
    .eq('document_id', documentId)
    .eq('document_hash', hash)
    .eq('execution_id', executionId)
    .select('execution_id');
  if (error) throw error;
  if (!data?.length) throw new Error('ANALYSIS_SUPERSEDED');
}
