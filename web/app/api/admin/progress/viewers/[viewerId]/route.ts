import { NextResponse, type NextRequest } from 'next/server';
import { progressViewerSchema } from '@/schemas/progress.schema';
import {
  deleteProgressViewer,
  updateProgressViewer,
} from '@/services/admin/progress.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';
interface Context {
  params: Promise<{ viewerId: string }>;
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    const body = (await request.json()) as {
      display_name?: string;
      is_active?: boolean;
      regenerate?: boolean;
    };
    const input = progressViewerSchema.partial().parse(body);
    return NextResponse.json({
      viewer: await updateProgressViewer(
        supabase,
        (await context.params).viewerId,
        { ...input, is_active: body.is_active, regenerate: body.regenerate },
      ),
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el enlace' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    await deleteProgressViewer(supabase, (await context.params).viewerId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo eliminar el gerente' },
      { status: 400 },
    );
  }
}
