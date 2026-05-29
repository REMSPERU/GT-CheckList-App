import { NextResponse, type NextRequest } from 'next/server';

import { updateAdminUserPassword } from '@/services/admin/users.service';
import {
  createServiceRoleSupabaseClient,
  requireSuperAdminSession,
} from '@/services/auth/server-auth.service';
import type { AdminUserPasswordUpdateInput } from '@/types/admin';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

function validatePasswordInput(input: AdminUserPasswordUpdateInput) {
  if (!input.generatePassword && (input.password?.trim().length ?? 0) < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  return null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    await requireSuperAdminSession(request);

    const body = (await request.json()) as AdminUserPasswordUpdateInput;
    const validationError = validatePasswordInput(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleSupabaseClient();
    const result = await updateAdminUserPassword(serviceSupabase, userId, body);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo cambiar la contraseña';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
