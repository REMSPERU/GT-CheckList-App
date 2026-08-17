import { Clock3 } from 'lucide-react';

import { formatInternalStatus } from './quote-formatters';
import type { AlexpertoQuoteAuditItem } from '@/types/alexperto';

interface QuoteHistoryPanelProps {
  quote: AlexpertoQuoteAuditItem;
}

export function QuoteHistoryPanel({ quote }: QuoteHistoryPanelProps) {
  return (
    <details className="border-t border-slate-200 pt-5">
      <summary className="cursor-pointer text-xs font-bold text-[#072e27] marker:text-slate-400">
        Historial de auditoría ({quote.history.length})
      </summary>
      <div className="mt-4 border-l-2 border-slate-200 pl-4 text-xs">
        <div className="relative">
          <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-600" />
          <p className="m-0 font-bold text-slate-900">
            Cotización registrada en Alexperto
          </p>
          <time className="mt-1 block text-[11px] text-slate-500">
            {new Date(quote.createdAt).toLocaleString('es-PE')}
          </time>
        </div>
        {quote.history.map(entry => (
          <div
            key={`${entry.createdAt}-${entry.createdBy?.id ?? 'system'}`}
            className="relative mt-5">
            <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-white bg-amber-500" />
            <p className="m-0 font-bold text-slate-900">
              {entry.previousStatus
                ? `${formatInternalStatus(entry.previousStatus)} a ${formatInternalStatus(entry.newStatus)}`
                : `Estado: ${formatInternalStatus(entry.newStatus)}`}
            </p>
            <span className="mt-1 block text-[11px] text-slate-500">
              {entry.createdBy?.name ?? 'Usuario no disponible'} ·{' '}
              {new Date(entry.createdAt).toLocaleString('es-PE')}
            </span>
          </div>
        ))}
        {quote.history.length === 0 && (
          <p className="flex items-center gap-1.5 text-slate-500">
            <Clock3 size={13} /> Aún no hay cambios registrados en GEMA.
          </p>
        )}
      </div>
    </details>
  );
}
