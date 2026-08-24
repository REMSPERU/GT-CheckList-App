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

const PROMPT_VERSION = 'technical-report-v1';
const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_INPUT_CHARS = 80_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 3_000;
const DEFAULT_TIMEOUT_MS = 60_000;

interface SummaryRow {
  status: TechnicalReportSummaryResponse['status'];
  summary_json: unknown;
  model: string | null;
  updated_at: string;
  error_message: string | null;
  processing_stage: TechnicalReportSummaryResponse['processingStage'];
}

function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) throw new Error('OPENROUTER_NOT_CONFIGURED');
  return {
    apiKey,
    model,
    fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL ?? null,
    maxInputChars: getNumberEnv(
      'OPENROUTER_MAX_INPUT_CHARS',
      DEFAULT_MAX_INPUT_CHARS,
    ),
    maxOutputTokens: getNumberEnv(
      'OPENROUTER_MAX_OUTPUT_TOKENS',
      DEFAULT_MAX_OUTPUT_TOKENS,
    ),
    temperature: Number(process.env.OPENROUTER_TEMPERATURE ?? 0.1),
    timeoutMs: getNumberEnv(
      'OPENROUTER_REQUEST_TIMEOUT_MS',
      DEFAULT_TIMEOUT_MS,
    ),
  };
}

function systemPrompt() {
  return `Eres un analista de informes técnicos de mantenimiento. Usa exclusivamente la información entregada. No inventes equipos, ubicaciones, páginas, evidencias ni datos técnicos. Cada hallazgo debe citar la página exacta donde aparece. Prioriza seguridad, continuidad operativa y riesgo de daño. La criticidad es una estimación: ALTA para riesgos a personas, incendio, falla inminente, equipo inoperativo o daño mayor; MEDIA para deficiencias que pueden escalar; BAJA para mejoras preventivas sin impacto inmediato. Devuelve solamente JSON válido.`;
}

function outputInstructions(pageCount: number) {
  return `Responde el objeto JSON con executiveSummary, importantHighlights, findings y limitations. Cada hallazgo requiere id, criticality (ALTA, MEDIA o BAJA), title, equipment (string o null), location (string o null), page (entero entre 1 y ${pageCount}), evidence, impact y recommendation. Máximo 15 hallazgos. El resumen ejecutivo debe ser conciso, de 3 a 5 líneas como máximo.`;
}

function parseSummary(content: string, pageCount: number) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OPENROUTER_INVALID_RESPONSE');
  }
  const summary = technicalReportSummarySchema.safeParse(parsed);
  if (
    !summary.success ||
    summary.data.findings.some(finding => finding.page > pageCount)
  ) {
    throw new Error('OPENROUTER_INVALID_RESPONSE');
  }
  return summary.data;
}

async function callOpenRouter(
  content: string,
  pageCount: number,
  model: string,
  config: ReturnType<typeof getOpenRouterConfig>,
) {
  console.info('OpenRouter analysis started', { model, pageCount });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
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
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt() },
            {
              role: 'user',
              content: `${outputInstructions(pageCount)}\n\n${content}`,
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      const body = (await response.text()).slice(0, 1_000);
      console.error('OpenRouter request failed', {
        model,
        status: response.status,
        body,
      });
      throw new Error(`OPENROUTER_HTTP_${response.status}`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      id?: string;
    };
    const result = payload.choices?.[0]?.message?.content;
    if (!result) throw new Error('OPENROUTER_INVALID_RESPONSE');
    console.info('OpenRouter analysis completed', {
      model,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
    });
    return {
      summary: parseSummary(result, pageCount),
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
      generationId: payload.id ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OPENROUTER_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWithFallback(
  content: string,
  pageCount: number,
  config: ReturnType<typeof getOpenRouterConfig>,
) {
  try {
    return await callOpenRouter(content, pageCount, config.model, config);
  } catch (error) {
    if (!config.fallbackModel) throw error;
    return callOpenRouter(content, pageCount, config.fallbackModel, config);
  }
}

function formatPartialSummaries(summaries: TechnicalReportSummary[]) {
  return summaries
    .map((summary, index) =>
      JSON.stringify({ lote: index + 1, hallazgos: summary.findings }),
    )
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
    };
  const summary =
    row.status === 'COMPLETED'
      ? technicalReportSummarySchema.parse(row.summary_json)
      : null;
  return {
    status: row.status,
    summary,
    model: row.model,
    analyzedAt: row.updated_at,
    errorMessage: row.error_message,
    processingStage: row.processing_stage,
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
      'status, summary_json, model, updated_at, error_message, processing_stage',
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

export async function generateTechnicalReportSummary(
  requestId: string,
  documentId: string,
  generatedBy: string,
  regenerate: boolean,
) {
  const document = await getAlexpertoTechnicalDocument(requestId, documentId);
  if (!document) throw new Error('DOCUMENT_NOT_ALLOWED');
  if (document.mimeType?.toLowerCase() !== 'application/pdf')
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
  const { error: processingError } = await supabase
    .from('alexperto_document_ai_summaries')
    .upsert(
      {
        request_id: requestId,
        document_id: documentId,
        document_hash: hash,
        status: 'PROCESSING',
        processing_stage: 'EXTRACTING',
        generated_by: generatedBy,
        prompt_version: PROMPT_VERSION,
        error_message: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'request_id,document_id,document_hash' },
    );
  if (processingError) throw processingError;
  try {
    const pages = await extractPdfText(
      bytes,
      getNumberEnv('OPENROUTER_MAX_PDF_PAGES', DEFAULT_MAX_PAGES),
    );
    const batches = splitPdfPages(pages, config.maxInputChars);
    console.info('Technical report text extracted', {
      requestId,
      documentId,
      pages: pages.length,
      batches: batches.length,
    });
    await setProcessingStage(
      supabase,
      requestId,
      documentId,
      hash,
      'ANALYZING',
    );
    const batchResults = await Promise.all(
      batches.map(batch =>
        analyzeWithFallback(
          formatPdfPages(batch, document.name),
          pages.length,
          config,
        ),
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
              'CONSOLIDATING',
            );
            return analyzeWithFallback(
              `Consolida los hallazgos parciales siguientes. Elimina duplicados, conserva solamente páginas originales verificables y no inventes información.\n\n${formatPartialSummaries(batchResults.map(result => result.summary))}`,
              pages.length,
              config,
            );
          })();
    const usedModel = batchResults.length === 1 ? config.model : config.model;
    const { error: completeError } = await supabase
      .from('alexperto_document_ai_summaries')
      .update({
        status: 'COMPLETED',
        processing_stage: null,
        summary_json: analysis.summary,
        model: usedModel,
        input_tokens: analysis.inputTokens,
        output_tokens: analysis.outputTokens,
        generation_id: analysis.generationId,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('request_id', requestId)
      .eq('document_id', documentId)
      .eq('document_hash', hash);
    if (completeError) throw completeError;
    return responseFromRow(await findSummary(requestId, documentId, hash));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ANALYSIS_FAILED';
    await supabase
      .from('alexperto_document_ai_summaries')
      .update({
        status: 'FAILED',
        processing_stage: null,
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('request_id', requestId)
      .eq('document_id', documentId)
      .eq('document_hash', hash);
    throw error;
  }
}

async function setProcessingStage(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  requestId: string,
  documentId: string,
  hash: string,
  processingStage: NonNullable<
    TechnicalReportSummaryResponse['processingStage']
  >,
) {
  const { error } = await supabase
    .from('alexperto_document_ai_summaries')
    .update({
      processing_stage: processingStage,
      updated_at: new Date().toISOString(),
    })
    .eq('request_id', requestId)
    .eq('document_id', documentId)
    .eq('document_hash', hash);
  if (error) throw error;
}
