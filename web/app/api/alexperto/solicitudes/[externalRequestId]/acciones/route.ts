import { NextRequest, NextResponse } from 'next/server';

import { alexpertoRequestAuditActionSchema } from '@/schemas/alexperto.schema';
import { requireAuthorizedRequest } from '@/services/alexperto/alexperto-request-access.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';
import type { AlexpertoInternalStatus } from '@/types/alexperto';

interface RouteContext {
  params: Promise<{ externalRequestId: string }>;
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
    const { externalRequestId } = await context.params;
    const action = alexpertoRequestAuditActionSchema.parse(
      await request.json(),
    );

    if (
      session.user.role === 'AUDITOR' &&
      !AUDITOR_STATUSES.has(action.status)
    ) {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }

    const property = await requireAuthorizedRequest(
      externalRequestId,
      session.userSupabase,
    );
    const { data: existingAction, error: existingActionError } =
      await session.supabase
        .from('alexperto_audit_actions')
        .select('current_status, auditor_comment, paul_comment')
        .eq('external_entity_type', 'REQUEST')
        .eq('external_entity_id', externalRequestId)
        .maybeSingle();
    if (existingActionError) throw existingActionError;

    const existing = existingAction as ExistingAction | null;
    const { error } = await session.supabase.rpc(
      'save_alexperto_audit_action',
      {
        p_external_entity_type: 'REQUEST',
        p_external_entity_id: externalRequestId,
        p_gema_property_id: property.id,
        p_status: action.status,
        p_auditor_comment: existing?.auditor_comment ?? null,
        p_paul_comment: existing?.paul_comment ?? null,
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
      historyEntry: action.recordHistory
        ? {
            previousStatus,
            newStatus: action.status,
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
    console.error('Alexperto request audit action failed');
    return NextResponse.json({ code: 'ACTION_UNAVAILABLE' }, { status: 500 });
  }
}
