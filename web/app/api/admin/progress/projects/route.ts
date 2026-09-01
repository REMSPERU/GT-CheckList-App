import { NextResponse, type NextRequest } from 'next/server';
import { progressProjectSchema } from '@/schemas/progress.schema';
import {
  createProgressProject,
  listProgressProjects,
} from '@/services/admin/progress.service';
import { requireSuperAdminSession } from '@/services/auth/server-auth.service';
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireSuperAdminSession(request);
    return NextResponse.json({
      projects: await listProgressProjects(supabase),
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireSuperAdminSession(request);
    const input = progressProjectSchema.parse(await request.json());
    return NextResponse.json(
      { project: await createProgressProject(supabase, input, user.id) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'ZodError'
        ? 'Datos inválidos'
        : 'No se pudo guardar el proyecto';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
