import { NextRequest, NextResponse } from 'next/server';

import {
  alexpertoAuditActionSchema,
  alexpertoQuoteDispatchSchema,
} from '@/schemas/alexperto.schema';
import {
  requireAuthorizedQuote,
  requireVisibleQuote,
} from '@/services/alexperto/alexperto-quote-access.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';
import type { AlexpertoInternalStatus } from '@/types/alexperto';

interface RouteContext {
  params: Promise<{ externalQuoteId: string }>;
}

interface ExistingAction {
  current_status: AlexpertoInternalStatus;
  auditor_comment: string | null;
  paul_comment: string | null;
}

const AUDITOR_STATUSES = new Set<AlexpertoInternalStatus>([
  'PENDIENTE_REVISION',
  'OBSERVADO',
  'CULMINADO',
]);

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 16_384) {
      return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
    }

    const session = await requireAlexpertoAccessSession(request);
    const { externalQuoteId } = await context.params;
    const body = await request.json();
    const dispatch = alexpertoQuoteDispatchSchema.safeParse(body);

    if (dispatch.success) {
      if (session.user.role !== 'SUPERADMIN') {
        return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
      }
      const property = await requireAuthorizedQuote(
        externalQuoteId,
        session.userSupabase,
      );
      const { data, error } = await session.supabase.rpc(
        'set_alexperto_quote_auditor_dispatch',
        {
          p_external_entity_id: externalQuoteId,
          p_gema_property_id: property.id,
          p_dispatch_status: dispatch.data.dispatchStatus,
          p_updated_by: session.user.id,
        },
      );
      if (error) throw error;
      return NextResponse.json({
        dispatchStatus: data.auditor_dispatch_status,
      });
    }

    const action = alexpertoAuditActionSchema.parse(body);

    if (
      session.user.role === 'AUDITOR' &&
      (!AUDITOR_STATUSES.has(action.status) || action.paulComment !== undefined)
    ) {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }

    const property = await requireVisibleQuote(
      externalQuoteId,
      session.userSupabase,
      session.supabase,
      session.user.role,
    );

    const { data: existingAction, error: existingActionError } =
      await session.supabase
        .from('alexperto_audit_actions')
        .select('current_status, auditor_comment, paul_comment')
        .eq('external_entity_type', 'QUOTE')
        .eq('external_entity_id', externalQuoteId)
        .maybeSingle();
    if (existingActionError) throw existingActionError;

    const existing = existingAction as ExistingAction | null;
    const auditorComment =
      session.user.role === 'AUDITOR'
        ? action.auditorComment === undefined
          ? (existing?.auditor_comment ?? null)
          : action.auditorComment
        : (existing?.auditor_comment ?? null);
    const paulComment =
      session.user.role === 'SUPERADMIN'
        ? action.paulComment === undefined
          ? (existing?.paul_comment ?? null)
          : action.paulComment
        : (existing?.paul_comment ?? null);
    const { data, error } = await session.supabase.rpc(
      'save_alexperto_audit_action',
      {
        p_external_entity_type: 'QUOTE',
        p_external_entity_id: externalQuoteId,
        p_gema_property_id: property.id,
        p_status: action.status,
        p_auditor_comment: auditorComment,
        p_paul_comment: paulComment,
        p_updated_by: session.user.id,
        p_record_history: action.recordHistory,
      },
    );
    if (error) throw error;

    const previousStatus = existing?.current_status ?? null;
    const actorName =
      [session.user.first_name, session.user.last_name]
        .filter(Boolean)
        .join(' ') ||
      session.user.username ||
      session.user.email;
    return NextResponse.json({
      action: data,
      historyEntry: action.recordHistory
        ? {
            previousStatus,
            newStatus: action.status,
            auditorComment,
            paulComment,
            createdAt: new Date().toISOString(),
            createdBy: { id: session.user.id, name: actorName },
          }
        : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ code: 'INVALID_ACTION' }, { status: 400 });
    }
    console.error('Alexperto audit action failed');
    return NextResponse.json({ code: 'ACTION_UNAVAILABLE' }, { status: 500 });
  }
}
