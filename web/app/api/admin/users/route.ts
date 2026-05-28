import { NextResponse, type NextRequest } from 'next/server';

import {
  listAdminUsers,
  listAssignableProperties,
} from '@/services/admin/users.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    const [users, properties] = await Promise.all([
      listAdminUsers(supabase),
      listAssignableProperties(supabase),
    ]);

    return NextResponse.json({ users, properties });
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED'
      ? 401
      : 403;

    return NextResponse.json({ error: 'No autorizado' }, { status });
  }
}
