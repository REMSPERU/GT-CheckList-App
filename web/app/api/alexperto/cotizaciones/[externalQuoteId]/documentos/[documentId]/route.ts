import { NextRequest, NextResponse } from 'next/server';

import { getAlexpertoQuoteDocumentUrl } from '@/services/alexperto/alexperto-documents.service';
import { requireAuthorizedQuote } from '@/services/alexperto/alexperto-quote-access.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ externalQuoteId: string; documentId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalQuoteId, documentId } = await context.params;
    await requireAuthorizedQuote(externalQuoteId, session.userSupabase);

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
