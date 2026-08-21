import { NextRequest, NextResponse } from 'next/server';

import { getAlexpertoQuoteDocumentUrl } from '@/services/alexperto/alexperto-documents.service';
import { requireVisibleQuote } from '@/services/alexperto/alexperto-quote-access.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ externalQuoteId: string; documentId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalQuoteId, documentId } = await context.params;
    const source = request.nextUrl.searchParams.get('source');
    await requireVisibleQuote(
      externalQuoteId,
      session.userSupabase,
      session.supabase,
      session.user.role,
    );

    const url = await getAlexpertoQuoteDocumentUrl(
      externalQuoteId,
      documentId,
      source === 'QUOTE' || source === 'PROPOSAL' ? source : undefined,
    );
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
