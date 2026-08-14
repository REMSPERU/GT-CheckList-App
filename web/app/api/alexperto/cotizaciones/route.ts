import { NextRequest, NextResponse } from 'next/server';

import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';
import { resolveAuthorizedProperties } from '@/services/alexperto/alexperto-access.service';
import { listAlexpertoQuotes } from '@/services/alexperto/alexperto-quotes.service';
import { alexpertoQuoteFiltersSchema } from '@/schemas/alexperto.schema';

function parseList(value: string | null) {
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : [];
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const params = request.nextUrl.searchParams;
    const filters = alexpertoQuoteFiltersSchema.parse({
      page: params.get('page') ?? undefined,
      pageSize: params.get('pageSize') ?? undefined,
      montoMinimo: params.get('montoMinimo') ?? undefined,
      especialidades: parseList(params.get('especialidades')),
      estadoExterno:
        params.get('estadoExterno') === null
          ? undefined
          : parseList(params.get('estadoExterno')),
      estadoInterno: parseList(params.get('estadoInterno')),
      propertyId: params.get('propertyId') ?? undefined,
      sort: params.get('sort') ?? undefined,
      direction: params.get('direction') ?? undefined,
    });
    const properties = await resolveAuthorizedProperties(session.userSupabase);
    const scopedProperties = filters.propertyId
      ? properties.filter(property => property.id === filters.propertyId)
      : properties;
    if (filters.propertyId && !scopedProperties.length) {
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }
    const result = await listAlexpertoQuotes(filters, scopedProperties, session.supabase);
    return NextResponse.json({ ...result, page: filters.page, pageSize: filters.pageSize, queriedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status = code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 500;
    console.error('Alexperto quotes list failed', { code });
    return NextResponse.json({ code: status === 500 ? 'ALEXPERTO_UNAVAILABLE' : code }, { status });
  }
}
