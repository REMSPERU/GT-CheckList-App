import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { RequestDocumentViewer } from './request-document-viewer';
import { formatExternalStatus, formatInternalStatus } from './quote-formatters';
import type { AlexpertoRequestListItem } from '@/types/alexperto';

interface RequestDetailDialogProps {
  request: AlexpertoRequestListItem | null;
  onClose: () => void;
}

function formatRequestType(type: string | null) {
  const labels: Record<string, string> = {
    PREVENTIVE: 'Preventivo',
    CORRECTIVE: 'Correctivo',
    REQUIREMENT: 'Requerimiento',
    CAPEX: 'CAPEX',
  };
  return type ? (labels[type] ?? type) : 'Sin tipo';
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="m-0 mt-0.5 text-xs font-semibold text-slate-800">
        {value}
      </dd>
    </div>
  );
}

export function RequestDetailDialog({
  request,
  onClose,
}: RequestDetailDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!request) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [request]);

  if (!request) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-5">
      <button
        type="button"
        aria-label="Cerrar detalle de solicitud"
        onClick={onClose}
        className="absolute inset-0 bg-[#061711]/65 backdrop-blur-sm"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f8faf6] shadow-2xl sm:h-[calc(100dvh-40px)] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#05221d] bg-[#072e27] px-4 py-1.5 text-white sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2
              id="request-detail-title"
              className="m-0 shrink-0 font-mono text-sm font-bold tracking-tight">
              {request.code}
            </h2>
            <span aria-hidden="true" className="h-4 w-px bg-emerald-800" />
            <p className="m-0 truncate text-xs text-emerald-100">
              {request.property.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-emerald-900 bg-[#05221d] text-slate-300 transition hover:bg-[#0a3d34] hover:text-white"
            aria-label="Cerrar detalle de solicitud">
            <X size={16} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-[#f8faf6] p-4 lg:border-b-0 lg:border-r">
            <h3 className="m-0 text-sm font-bold text-slate-900">
              Detalle de solicitud
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailItem label="Código" value={request.code} />
              <DetailItem
                label="Fecha programada"
                value={new Date(
                  request.startTime ?? request.createdAt,
                ).toLocaleDateString('es-PE')}
              />
              <DetailItem label="Inmueble" value={request.property.name} />
              <DetailItem
                label="Especialidad"
                value={request.specialty?.name ?? 'Sin clasificar'}
              />
              <DetailItem
                label="Tipo de solicitud"
                value={formatRequestType(request.requestType)}
              />
              <DetailItem
                label="Estado Alexperto"
                value={formatExternalStatus(request.externalStatus)}
              />
              <DetailItem
                label="Estado GEMA"
                value={
                  request.internalStatus === 'PENDIENTE_REVISION'
                    ? 'Pendiente de revisión'
                    : formatInternalStatus(request.internalStatus)
                }
              />
              <DetailItem
                label="Cotizaciones"
                value={String(request.quoteCount)}
              />
            </dl>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h4 className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Descripción
              </h4>
              <p className="m-0 mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                {request.description ?? 'Sin descripción.'}
              </p>
            </div>
          </aside>
          <RequestDocumentViewer requestId={request.externalRequestId} />
        </div>
      </section>
    </div>
  );
}
