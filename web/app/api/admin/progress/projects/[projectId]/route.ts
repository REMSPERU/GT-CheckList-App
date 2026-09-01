import { NextResponse, type NextRequest } from 'next/server';
import { progressProjectSchema } from '@/schemas/progress.schema';
import {
  deleteProgressProject,
  getProgressProject,
  updateProgressProject,
} from '@/services/admin/progress.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';
interface Context {
  params: Promise<{ projectId: string }>;
}
export async function GET(request: NextRequest, context: Context) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    return NextResponse.json({
      project: await getProgressProject(
        supabase,
        (await context.params).projectId,
      ),
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { supabase, user } = await requireSuperAdminSession(request);
    const input = progressProjectSchema.partial().parse(await request.json());
    return NextResponse.json({
      project: await updateProgressProject(
        supabase,
        (await context.params).projectId,
        input,
        user.id,
      ),
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el proyecto' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    await deleteProgressProject(supabase, (await context.params).projectId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo eliminar el proyecto' },
      { status: 400 },
    );
  }
}
