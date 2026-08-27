import { NextRequest, NextResponse } from 'next/server';

import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';
import { resolveAuthorizedProperties } from '@/services/alexperto/alexperto-access.service';
import {
  findAuthorizedQuoteProperty,
  getAlexpertoQuoteNotes,
} from '@/services/alexperto/alexperto-quotes.service';

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

    if (!property) {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }

    const notes = await getAlexpertoQuoteNotes(externalQuoteId);
    return NextResponse.json(
      { notes },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status =
      code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 500;
    console.error('Alexperto quote notes failed', { code, error });
    return NextResponse.json(
      { code: status === 500 ? 'ALEXPERTO_UNAVAILABLE' : code },
      { status },
    );
  }
}
