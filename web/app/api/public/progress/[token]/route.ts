import { NextResponse, type NextRequest } from 'next/server';
import { getPublicProgress } from '@/services/progress-public.service';
interface Context {
  params: Promise<{ token: string }>;
}
export async function GET(_request: NextRequest, context: Context) {
  try {
    const token = (await context.params).token;
    if (!/^[a-f0-9]{64}$/.test(token))
      return NextResponse.json({ error: 'Enlace inválido' }, { status: 404 });
    const result = await getPublicProgress(token);
    if (!result)
      return NextResponse.json(
        { error: 'Enlace inválido o desactivado' },
        { status: 404 },
      );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar el avance' },
      { status: 500 },
    );
  }
}
