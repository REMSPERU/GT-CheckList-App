import { NextResponse, type NextRequest } from 'next/server';
import { progressViewerSchema } from '@/schemas/progress.schema';
import {
  createProgressViewer,
  listProgressViewers,
} from '@/services/admin/progress.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    return NextResponse.json({ viewers: await listProgressViewers(supabase) });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    const { display_name } = progressViewerSchema.parse(await request.json());
    return NextResponse.json(
      { viewer: await createProgressViewer(supabase, display_name) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo crear el enlace' },
      { status: 400 },
    );
  }
}
