import { NextRequest, NextResponse } from 'next/server';

import { alexpertoRequestFiltersSchema } from '@/schemas/alexperto.schema';
import { resolveAuthorizedProperties } from '@/services/alexperto/alexperto-access.service';
import { listAlexpertoRequests } from '@/services/alexperto/alexperto-requests.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

function parseList(value: string | null) {
  return value
    ? value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    : [];
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const params = request.nextUrl.searchParams;
    const filters = alexpertoRequestFiltersSchema.parse({
      page: params.get('page') ?? undefined,
      pageSize: params.get('pageSize') ?? undefined,
      requestTypes: parseList(params.get('requestTypes')),
      especialidades: parseList(params.get('especialidades')),
      estadoExterno: parseList(params.get('estadoExterno')),
      estadoInterno: parseList(params.get('estadoInterno')),
      inmuebles: parseList(params.get('inmuebles')),
      search: params.get('search') ?? undefined,
      fechaDesde: params.get('fechaDesde') ?? undefined,
      fechaHasta: params.get('fechaHasta') ?? undefined,
      propertyId: params.get('propertyId') ?? undefined,
      sort: params.get('sort') ?? undefined,
      direction: params.get('direction') ?? undefined,
    });
    const properties = await resolveAuthorizedProperties(session.userSupabase);
    const scopedProperties = filters.propertyId
      ? properties.filter(property => property.id === filters.propertyId)
      : properties;
    if (filters.propertyId && !scopedProperties.length)
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    const result = await listAlexpertoRequests(
      filters,
      scopedProperties,
      session.supabase,
    );
    return NextResponse.json(
      {
        ...result,
        page: filters.page,
        pageSize: filters.pageSize,
        queriedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status =
      code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 500;
    console.error('Alexperto requests list failed', { code });
    return NextResponse.json(
      { code: status === 500 ? 'ALEXPERTO_UNAVAILABLE' : code },
      { status },
    );
  }
}
