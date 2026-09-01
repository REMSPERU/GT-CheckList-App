import { NextRequest, NextResponse } from 'next/server';

import { resolveAuthorizedProperties } from '@/services/alexperto/alexperto-access.service';
import {
  findRequestPropertyByCode,
  getAlexpertoRequestByCode,
} from '@/services/alexperto/alexperto-requests.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    let code: string;
    try {
      code = decodeURIComponent((await context.params).code);
    } catch {
      return NextResponse.json({ code: 'INVALID_CODE' }, { status: 400 });
    }
    const properties = await resolveAuthorizedProperties(session.userSupabase);
    const propertyMatch = await findRequestPropertyByCode(code, properties);
    const property = propertyMatch?.property;
    if (!property) {
      if (!propertyMatch)
        return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }
    const detail = await getAlexpertoRequestByCode(
      code,
      properties,
      session.supabase,
    );
    if (!detail)
      return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json(detail, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const status =
      code === 'UNAUTHENTICATED'
        ? 401
        : code === 'FORBIDDEN'
          ? 403
          : code === 'ALEXPERTO_CODE_CONFLICT'
            ? 409
            : 500;
    return NextResponse.json(
      { code: status === 500 ? 'ALEXPERTO_UNAVAILABLE' : code },
      { status },
    );
  }
}
