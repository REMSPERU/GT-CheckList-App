import { NextRequest, NextResponse } from 'next/server';

import { resolveAuthorizedProperties } from '@/services/alexperto/alexperto-access.service';
import {
  findQuotePropertyByCode,
  getAlexpertoQuoteByCode,
} from '@/services/alexperto/alexperto-quotes.service';
import { requireAlexpertoAccessSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ code: string }>;
}

function decodeCode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error('INVALID_CODE');
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAlexpertoAccessSession(request);
    const code = decodeCode((await context.params).code);
    const properties = await resolveAuthorizedProperties(session.userSupabase);
    const propertyMatch = await findQuotePropertyByCode(code, properties);
    const property = propertyMatch?.property;
    if (!property) {
      if (!propertyMatch)
        return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
      return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    }
    const detail = await getAlexpertoQuoteByCode(
      code,
      properties,
      session.supabase,
      session.user.role === 'AUDITOR',
      session.user.role === 'SUPERADMIN',
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
            : code === 'INVALID_CODE'
              ? 400
              : 500;
    return NextResponse.json(
      { code: status === 500 ? 'ALEXPERTO_UNAVAILABLE' : code },
      { status },
    );
  }
}
