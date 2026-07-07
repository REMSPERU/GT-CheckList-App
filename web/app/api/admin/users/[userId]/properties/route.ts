import { NextResponse, type NextRequest } from 'next/server';

import {
  assignUserToProperty,
  listUserPropertyAccess,
} from '@/services/admin/users.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const { supabase } = await requireSuperAdminSession(request);
    const accesses = await listUserPropertyAccess(supabase, userId);

    return NextResponse.json({ accesses });
  } catch (error) {
    console.error('[API GET properties] Error:', error);
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED'
      ? 401
      : 403;

    return NextResponse.json({ error: 'No autorizado' }, { status });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const body = (await request.json()) as {
      propertyId?: string;
      propertyRole?: string | null;
      assignmentReason?: string | null;
    };

    if (!body.propertyId) {
      return NextResponse.json(
        { error: 'Debe seleccionar un inmueble' },
        { status: 400 },
      );
    }

    const { supabase, user: adminUser } = await requireSuperAdminSession(request);
    await assignUserToProperty(supabase, {
      userId,
      propertyId: body.propertyId,
      propertyRole: body.propertyRole,
      assignmentReason: body.assignmentReason,
      assignedBy: adminUser.id,
    });

    const accesses = await listUserPropertyAccess(supabase, userId);

    return NextResponse.json({ accesses });
  } catch (error) {
    console.error('[API POST properties] Error:', error);
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED'
      ? 401
      : 403;

    return NextResponse.json({ error: 'No autorizado' }, { status });
  }
}
