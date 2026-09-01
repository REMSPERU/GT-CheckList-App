'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequestDetailDialog } from './request-detail-dialog';
import { useAdminSession } from '@/hooks/auth/use-admin-session';
import { fetchWithAuth } from '@/services/auth/auth.service';
import type { AlexpertoRequestListItem } from '@/types/alexperto';

export function RequestCodeDetail({ code }: { code: string }) {
  const router = useRouter();
  const { user } = useAdminSession();
  const [request, setRequest] = useState<AlexpertoRequestListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchWithAuth(
      `/api/alexperto/solicitudes/by-code/${encodeURIComponent(code)}`,
    )
      .then(async response => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'No se encontró la solicitud.'
              : response.status === 403
                ? 'No tienes permiso para ver esta solicitud.'
                : response.status === 409
                  ? 'El código corresponde a más de una solicitud.'
                  : 'No se pudo cargar la solicitud.',
          );
        if (!cancelled)
          setRequest((await response.json()) as AlexpertoRequestListItem);
      })
      .catch(
        loadError =>
          !cancelled &&
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la solicitud.',
          ),
      );
    return () => {
      cancelled = true;
    };
  }, [code]);
  if (error)
    return (
      <main className="grid min-h-[400px] place-items-center gap-3 p-6 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/admin/alexperto/solicitudes')}
          className="rounded-md bg-emerald-900 px-3 py-2 text-xs font-bold text-white">
          Volver a solicitudes
        </button>
      </main>
    );
  if (!request)
    return (
      <div className="grid min-h-[400px] place-items-center text-sm text-slate-500">
        Cargando solicitud...
      </div>
    );
  return (
    <RequestDetailDialog
      request={request}
      isSuperadmin={user?.role === 'SUPERADMIN'}
      onClose={() => router.push('/admin/alexperto/solicitudes')}
      onStatusUpdate={async input => {
        const response = await fetchWithAuth(
          `/api/alexperto/solicitudes/${input.requestId}/acciones`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: input.status,
              recordHistory: input.recordHistory,
            }),
          },
        );
        if (!response.ok)
          throw new Error('No se pudo guardar la revisión en GEMA.');
        const updated = await fetchWithAuth(
          `/api/alexperto/solicitudes/by-code/${encodeURIComponent(code)}`,
        );
        if (updated.ok)
          setRequest((await updated.json()) as AlexpertoRequestListItem);
      }}
    />
  );
}
