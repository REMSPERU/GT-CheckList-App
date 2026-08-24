import { NextRequest, NextResponse } from 'next/server';

import {
  generateTechnicalReportSummary,
  getTechnicalReportSummary,
} from '@/services/alexperto/technical-report-ai.service';
import { requireAuthorizedRequest } from '@/services/alexperto/alexperto-request-access.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ externalRequestId: string; documentId: string }>;
}

function errorResponse(error: unknown) {
  const details =
    error && typeof error === 'object'
      ? (error as { message?: unknown; code?: unknown; details?: unknown })
      : null;
  const code =
    error instanceof Error
      ? error.message
      : typeof details?.code === 'string'
        ? details.code
        : typeof details?.message === 'string'
          ? details.message
          : 'INTERNAL_ERROR';
  const status =
    code === 'UNAUTHENTICATED'
      ? 401
      : code === 'FORBIDDEN'
        ? 403
        : code === 'DOCUMENT_NOT_ALLOWED' || code === 'PDF_WITHOUT_TEXT'
          ? 422
          : code === 'PDF_TOO_LARGE'
            ? 413
            : code.startsWith('OPENROUTER_')
              ? 502
              : 500;
  const message =
    code === 'PDF_WITHOUT_TEXT'
      ? 'Este informe parece ser escaneado o no contiene texto seleccionable. La demo actual no permite analizarlo.'
      : code === 'PDF_TOO_MANY_PAGES'
        ? 'El informe supera el número máximo de páginas permitido.'
        : code === 'PDF_TOO_LONG'
          ? 'El informe supera el tamaño de análisis permitido.'
          : code === 'OPENROUTER_NOT_CONFIGURED'
            ? 'El análisis IA no está configurado.'
            : code === 'OPENROUTER_TIMEOUT'
              ? 'OpenRouter tardó demasiado en responder. Intenta nuevamente o prueba otro modelo.'
              : 'OpenRouter no pudo procesar el resumen técnico.';
  console.error('Technical report summary failed', {
    code,
    details: typeof details?.details === 'string' ? details.details : undefined,
  });
  return NextResponse.json({ code, message }, { status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalRequestId, documentId } = await context.params;
    await requireAuthorizedRequest(externalRequestId, session.userSupabase);
    return NextResponse.json(
      await getTechnicalReportSummary(externalRequestId, documentId),
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalRequestId, documentId } = await context.params;
    await requireAuthorizedRequest(externalRequestId, session.userSupabase);
    const body = (await request.json().catch(() => ({}))) as {
      regenerate?: unknown;
    };
    const result = await generateTechnicalReportSummary(
      externalRequestId,
      documentId,
      session.user.id,
      body.regenerate === true,
    );
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
