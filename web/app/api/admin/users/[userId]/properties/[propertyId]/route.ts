import { NextResponse, type NextRequest } from 'next/server';

import { unassignUserFromProperty } from '@/services/admin/users.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ userId: string; propertyId: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId, propertyId } = await context.params;
    const { supabase } = await requireSuperAdminSession(request);
    await unassignUserFromProperty(supabase, userId, propertyId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED'
      ? 401
      : 403;

    return NextResponse.json({ error: 'No autorizado' }, { status });
  }
}
