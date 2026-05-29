import { NextResponse, type NextRequest } from 'next/server';

import {
  ADMIN_ROLE_OPTIONS,
  createAdminUser,
  listAdminUsers,
  listAssignableProperties,
} from '@/services/admin/users.service';
import {
  createServiceRoleSupabaseClient,
  requireSuperAdminSession,
} from '@/services/auth/server-auth.service';
import type { AdminUserCreateInput } from '@/types/admin';

const ALLOWED_ROLES = new Set(ADMIN_ROLE_OPTIONS.map(item => item.value));

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateUserInput(input: AdminUserCreateInput) {
  if (!input.email?.trim() || !isValidEmail(input.email.trim())) {
    return 'Correo invalido';
  }

  if (!input.role || !ALLOWED_ROLES.has(input.role)) {
    return 'Rol invalido';
  }

  if (!input.generatePassword && (input.password?.trim().length ?? 0) < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    const [users, properties] = await Promise.all([
      listAdminUsers(supabase),
      listAssignableProperties(supabase),
    ]);

    return NextResponse.json({ users, properties });
  } catch (error) {
    const status =
      error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 403;

    return NextResponse.json({ error: 'No autorizado' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdminSession(request);

    const body = (await request.json()) as AdminUserCreateInput;
    const validationError = validateUserInput(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleSupabaseClient();
    const result = await createAdminUser(serviceSupabase, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const message =
      error instanceof Error ? error.message : 'No se pudo crear el usuario';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
