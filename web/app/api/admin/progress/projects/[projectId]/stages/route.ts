import { NextResponse, type NextRequest } from 'next/server';
import { progressStagesSchema } from '@/schemas/progress.schema';
import { updateProgressStages } from '@/services/admin/progress.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';
interface Context {
  params: Promise<{ projectId: string }>;
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { supabase, user } = await requireSuperAdminSession(request);
    const body = progressStagesSchema.parse(await request.json());
    return NextResponse.json({
      project: await updateProgressStages(
        supabase,
        (await context.params).projectId,
        body.stages,
        user.id,
      ),
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudieron actualizar las etapas' },
      { status: 400 },
    );
  }
}
