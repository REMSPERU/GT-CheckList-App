import { NextRequest, NextResponse } from 'next/server';

import { resolveAuthorizedProperties } from '@/services/alexperto/alexperto-access.service';
import { getAlexpertoQuoteDocumentUrl } from '@/services/alexperto/alexperto-documents.service';
import { findAuthorizedQuoteProperty } from '@/services/alexperto/alexperto-quotes.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ externalQuoteId: string; documentId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalQuoteId, documentId } = await context.params;
    const properties = await resolveAuthorizedProperties(session.userSupabase);
    const property = await findAuthorizedQuoteProperty(
      externalQuoteId,
      properties,
    );
    if (!property)
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });

    const url = await getAlexpertoQuoteDocumentUrl(externalQuoteId, documentId);
    if (!url) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json(
      { url },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status =
      code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 500;
    console.error('Alexperto quote document URL failed', { code });
    return NextResponse.json({ code: 'DOCUMENT_UNAVAILABLE' }, { status });
  }
}
