import { NextRequest, NextResponse } from 'next/server';

import { listAlexpertoRequestDocuments } from '@/services/alexperto/alexperto-documents.service';
import { requireAuthorizedRequest } from '@/services/alexperto/alexperto-request-access.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ externalRequestId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalRequestId } = await context.params;
    await requireAuthorizedRequest(externalRequestId, session.userSupabase);

    const items = await listAlexpertoRequestDocuments(externalRequestId);
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status =
      code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 500;
    console.error('Alexperto request documents list failed', { code });
    return NextResponse.json({ code: 'DOCUMENTS_UNAVAILABLE' }, { status });
  }
}
