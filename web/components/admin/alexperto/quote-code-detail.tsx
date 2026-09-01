'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { QuoteWorkspaceDialog } from './quote-workspace-dialog';
import { useAdminSession } from '@/hooks/auth/use-admin-session';
import { fetchWithAuth } from '@/services/auth/auth.service';
import type {
  AlexpertoQuoteAuditItem,
  AlexpertoQuoteListItem,
} from '@/types/alexperto';

export function QuoteCodeDetail({ code }: { code: string }) {
  const router = useRouter();
  const { user } = useAdminSession();
  const [quote, setQuote] = useState<AlexpertoQuoteAuditItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchWithAuth(
      `/api/alexperto/cotizaciones/by-code/${encodeURIComponent(code)}`,
    )
      .then(async response => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'No se encontró la cotización.'
              : response.status === 403
                ? 'No tienes permiso para ver esta cotización.'
                : response.status === 409
                  ? 'El código corresponde a más de una cotización.'
                  : 'No se pudo cargar la cotización.',
          );
        const item = (await response.json()) as AlexpertoQuoteListItem;
        if (cancelled) return;
        setQuote({
          id: item.externalQuoteId,
          code: item.code,
          propertyName: item.property.name,
          specialty: item.specialty.name,
          subSpecialty: item.specialty.code,
          externalStatus: item.externalStatus ?? 'SIN ESTADO',
          gemaStatus: item.internalStatus,
          amount: item.amount,
          createdAt: item.createdAt,
          delayDays: item.delayDays,
          provider: item.providerName,
          creationUserType: item.creationUserType,
          requester: item.serviceCode ? `Sol. ${item.serviceCode}` : null,
          description: item.service,
          serviceCode: item.serviceCode,
          auditorComment: item.auditorComment,
          paulComment: item.paulComment,
          history: item.history,
          notes: item.notes,
          responsibleAuditors: item.responsibleAuditors,
          auditorDispatchStatus: item.auditorDispatchStatus,
        });
      })
      .catch(loadError => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la cotización.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);
  if (error)
    return (
      <DetailError
        message={error}
        onBack={() => router.push('/admin/alexperto/cotizaciones')}
      />
    );
  if (!quote)
    return (
      <div className="grid min-h-[400px] place-items-center text-sm text-slate-500">
        Cargando cotización...
      </div>
    );
  return (
    <QuoteWorkspaceDialog
      quote={quote}
      isSuperadmin={user?.role === 'SUPERADMIN'}
      onClose={() => router.push('/admin/alexperto/cotizaciones')}
      onStatusUpdate={async input => {
        const response = await fetchWithAuth(
          `/api/alexperto/cotizaciones/${input.quoteId}/acciones`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: input.status,
              auditorComment: input.auditorComment,
              paulComment: input.paulComment,
              recordHistory: input.recordHistory,
            }),
          },
        );
        if (!response.ok)
          throw new Error('No se pudo guardar la revisión en GEMA.');
        const updated = await fetchWithAuth(
          `/api/alexperto/cotizaciones/by-code/${encodeURIComponent(code)}`,
        );
        if (updated.ok) {
          const item = (await updated.json()) as AlexpertoQuoteListItem;
          setQuote(current =>
            current
              ? {
                  ...current,
                  gemaStatus: item.internalStatus,
                  auditorComment: item.auditorComment,
                  paulComment: item.paulComment,
                  history: item.history,
                }
              : current,
          );
        }
      }}
      onDispatchUpdate={async (quoteId, dispatchStatus) => {
        const response = await fetchWithAuth(
          `/api/alexperto/cotizaciones/${quoteId}/acciones`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dispatchStatus }),
          },
        );
        if (!response.ok)
          throw new Error('No se pudo actualizar el despacho al auditor.');
        const updated = await fetchWithAuth(
          `/api/alexperto/cotizaciones/by-code/${encodeURIComponent(code)}`,
        );
        if (updated.ok) {
          const item = (await updated.json()) as AlexpertoQuoteListItem;
          setQuote(current =>
            current
              ? {
                  ...current,
                  auditorDispatchStatus: item.auditorDispatchStatus,
                }
              : current,
          );
        }
      }}
    />
  );
}

function DetailError({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <main className="grid min-h-[400px] place-items-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-red-700">{message}</p>
      <button
        type="button"
        onClick={onBack}
        className="rounded-md bg-emerald-900 px-3 py-2 text-xs font-bold text-white">
        Volver a cotizaciones
      </button>
    </main>
  );
}
