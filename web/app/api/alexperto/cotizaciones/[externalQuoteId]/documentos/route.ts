import { NextRequest, NextResponse } from 'next/server';

import { listAlexpertoQuoteDocuments } from '@/services/alexperto/alexperto-documents.service';
import { requireAuthorizedQuote } from '@/services/alexperto/alexperto-quote-access.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ externalQuoteId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const { externalQuoteId } = await context.params;
    await requireAuthorizedQuote(externalQuoteId, session.userSupabase);

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
