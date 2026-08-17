import { NextRequest, NextResponse } from 'next/server';

import { resolveAuthorizedProperties } from '@/services/alexperto/alexperto-access.service';
import { findAuthorizedQuoteProperty } from '@/services/alexperto/alexperto-quotes.service';
import { listAlexpertoQuoteDocuments } from '@/services/alexperto/alexperto-documents.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ externalQuoteId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalQuoteId } = await context.params;
    const properties = await resolveAuthorizedProperties(session.userSupabase);
    const property = await findAuthorizedQuoteProperty(
      externalQuoteId,
      properties,
    );
    if (!property)
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });

    const items = await listAlexpertoQuoteDocuments(externalQuoteId);
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status =
      code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 500;
    console.error('Alexperto quote documents list failed', { code });
    return NextResponse.json({ code: 'DOCUMENTS_UNAVAILABLE' }, { status });
  }
}
