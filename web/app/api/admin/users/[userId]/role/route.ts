import { NextResponse, type NextRequest } from 'next/server';

import {
  ADMIN_ROLE_OPTIONS,
  countActiveSuperadmins,
  updateAdminUserRole,
} from '@/services/admin/users.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';
import type { AdminRole } from '@/types/auth';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

const ALLOWED_ROLES = new Set(ADMIN_ROLE_OPTIONS.map(item => item.value));

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const body = (await request.json()) as { role?: AdminRole };

    if (!body.role || !ALLOWED_ROLES.has(body.role)) {
      return NextResponse.json({ error: 'Rol invalido' }, { status: 400 });
    }

    const { supabase, user } = await requireSuperAdminSession(request);

    if (user.id === userId && body.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'No puedes quitarte tu propio rol SUPERADMIN' },
        { status: 400 },
      );
    }

    if (body.role !== 'SUPERADMIN') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      if (targetUser?.role === 'SUPERADMIN' && targetUser.is_active) {
        const activeSuperadmins = await countActiveSuperadmins(supabase);
        if (activeSuperadmins <= 1) {
          return NextResponse.json(
            { error: 'Debe existir al menos un SUPERADMIN activo' },
            { status: 400 },
          );
        }
      }
    }

    const updatedUser = await updateAdminUserRole(supabase, userId, body.role);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED'
      ? 401
      : 403;

    return NextResponse.json({ error: 'No autorizado' }, { status });
  }
}
