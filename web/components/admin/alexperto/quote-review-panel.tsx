import { CheckCircle2, Copy, FileCheck, Save } from 'lucide-react';

import { formatExternalStatus, formatInternalStatus } from './quote-formatters';
import type {
  AlexpertoInternalStatus,
  AlexpertoQuoteAuditItem,
} from '@/types/alexperto';

const SPEECH_TEMPLATES = [
  {
    id: 'high-amount',
    title: 'Monto alto (más de S/ 3,000)',
    content:
      'Estimado equipo, la cotización supera los S/ 3,000. Se requiere adjuntar 3 propuestas comparativas y el informe técnico de sustento para proceder.',
  },
  {
    id: 'missing-report',
    title: 'Sin informe técnico',
    content:
      'Se observa la cotización debido a que no cuenta con el informe técnico de diagnóstico previo firmado por la contrata.',
  },
  {
    id: 'approved',
    title: 'Conforme sin observaciones',
    content:
      'Cotización revisada por el auditor GEMA. Cuenta con sustento completo y precios acordes al tarifario vigente. Procede ejecución.',
  },
];

interface QuoteReviewPanelProps {
  quote: AlexpertoQuoteAuditItem;
  isSuperadmin: boolean;
  auditorComment: string;
  paulComment: string;
  isSaving: boolean;
  error: string | null;
  onAuditorCommentChange: (value: string) => void;
  onPaulCommentChange: (value: string) => void;
  onSave: (status: AlexpertoInternalStatus, recordHistory: boolean) => void;
  onNotice: (message: string) => void;
}

export function QuoteReviewPanel({
  quote,
  isSuperadmin,
  auditorComment,
  paulComment,
  isSaving,
  error,
  onAuditorCommentChange,
  onPaulCommentChange,
  onSave,
  onNotice,
}: QuoteReviewPanelProps) {
  const isCompleted =
    quote.gemaStatus === 'CULMINADO' || quote.gemaStatus === 'VALIDADO';

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Estado Alexperto
            </p>
            <p className="mb-0 mt-1 text-sm font-bold text-slate-900">
              {formatExternalStatus(quote.externalStatus)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-bold text-emerald-900">
            <CheckCircle2 size={14} className="text-emerald-700" />
            {isCompleted
              ? formatInternalStatus(quote.gemaStatus)
              : formatInternalStatus(quote.gemaStatus)}
          </span>
        </div>
      </section>

      <section>
        <h3 className="m-0 text-sm font-bold text-slate-900">Información</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
          <div>
            <dt className="text-slate-500">Especialidad</dt>
            <dd className="m-0 mt-1 font-semibold text-slate-900">
              {quote.specialty}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Proveedor</dt>
            <dd className="m-0 mt-1 font-semibold text-slate-900">
              {quote.provider ?? 'Sin proveedor asignado'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Descripción</dt>
            <dd className="m-0 mt-1 whitespace-pre-wrap leading-relaxed text-slate-800">
              {quote.description ?? quote.requester ?? 'Sin descripción'}
            </dd>
          </div>
        </dl>
      </section>

      {!isSuperadmin && (
        <details className="border-t border-slate-200 pt-4">
          <summary className="cursor-pointer text-xs font-bold text-[#072e27] marker:text-slate-400">
            Plantillas de comentario
          </summary>
          <div className="mt-3 space-y-2">
            {SPEECH_TEMPLATES.map(template => (
              <div key={template.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {template.title}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(template.content)
                          .then(() =>
                            onNotice('Plantilla copiada al portapapeles.'),
                          )
                      }
                      className="rounded p-1 text-slate-500 hover:bg-slate-200"
                      aria-label={`Copiar ${template.title}`}>
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAuditorCommentChange(template.content)}
                      className="rounded bg-[#072e27] p-1 text-emerald-300 hover:bg-[#05221d]"
                      aria-label={`Usar ${template.title}`}>
                      <FileCheck size={13} />
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <section className="border-t border-slate-200 pt-4">
        <label
          htmlFor="auditor-comment"
          className="block text-xs font-bold text-slate-700">
          Comentario del auditor
        </label>
        <textarea
          id="auditor-comment"
          rows={5}
          value={auditorComment}
          onChange={event => onAuditorCommentChange(event.target.value)}
          disabled={isSuperadmin}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <label
          htmlFor="paul-comment"
          className="mt-4 block text-xs font-bold text-slate-700">
          Comentario Paul
        </label>
        <textarea
          id="paul-comment"
          rows={5}
          value={paulComment}
          onChange={event => onPaulCommentChange(event.target.value)}
          disabled={!isSuperadmin}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </section>

      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
      <section className="space-y-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => onSave(quote.gemaStatus, false)}
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60">
          <Save size={15} /> {isSaving ? 'Guardando...' : 'Guardar comentarios'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSave('OBSERVADO', true)}
            disabled={isSaving}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-900 disabled:opacity-60">
            Observar
          </button>
          <button
            type="button"
            onClick={() => onSave('CULMINADO', true)}
            disabled={isSaving}
            className="rounded-lg bg-[#072e27] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60">
            Culminar
          </button>
          <button
            type="button"
            onClick={() => onSave('PENDIENTE_REVISION', true)}
            disabled={isSaving || quote.gemaStatus === 'PENDIENTE_REVISION'}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 disabled:opacity-60">
            Pendiente
          </button>
          {isSuperadmin && (
            <button
              type="button"
              onClick={() => onSave('VALIDADO', true)}
              disabled={isSaving}
              className="rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60">
              Validar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
