import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Undo2,
  User,
} from 'lucide-react';

import { useQuoteNotes } from '@/hooks/alexperto/use-quote-notes';
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
  onDispatch: (dispatchStatus: 'ENVIADO' | 'RETIRADO') => void;
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
  onDispatch,
  onNotice,
}: QuoteReviewPanelProps) {
  const { notes, isLoading: isLoadingNotes } = useQuoteNotes(quote.id);
  const gemaStatusStyle =
    quote.gemaStatus === 'OBSERVADO'
      ? {
          label: 'Observado',
          className: 'border border-amber-300 bg-amber-100 text-amber-950',
          Icon: AlertCircle,
        }
      : quote.gemaStatus === 'CULMINADO' || quote.gemaStatus === 'VALIDADO'
        ? {
            label: formatInternalStatus(quote.gemaStatus),
            className:
              'border border-emerald-200 bg-emerald-100 text-emerald-900',
            Icon: CheckCircle2,
          }
        : {
            label: 'Pendiente de revisión',
            className: 'border border-slate-200 bg-slate-100 text-slate-700',
            Icon: Clock,
          };
  const GemaStatusIcon = gemaStatusStyle.Icon;

  return (
    <div className="space-y-4">
      {/* STATUS & AMOUNT OVERVIEW */}
      <section className="space-y-2.5 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Estado Alexperto
            </p>
            <p className="mb-0 mt-1 text-sm font-bold text-slate-900">
              {formatExternalStatus(quote.externalStatus)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${gemaStatusStyle.className}`}>
            <GemaStatusIcon size={14} />
            {gemaStatusStyle.label}
          </span>
        </div>

        {/* IMPORTE / MONTO HIGHLIGHT */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Importe Económico
            </span>
            <span className="font-mono text-sm font-extrabold text-emerald-950">
              {quote.amount
                ? `S/ ${Number(quote.amount).toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : 'S/ 0.00'}
            </span>
          </div>
        </div>
      </section>

      {isSuperadmin && (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Visibilidad para auditor
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span
              className={`text-xs font-bold ${quote.auditorDispatchStatus === 'ENVIADO' ? 'text-sky-800' : quote.auditorDispatchStatus === 'RETIRADO' ? 'text-rose-800' : 'text-slate-600'}`}>
              {quote.auditorDispatchStatus === 'ENVIADO'
                ? 'Enviada al auditor del inmueble'
                : quote.auditorDispatchStatus === 'RETIRADO'
                  ? 'Retirada de la bandeja del auditor'
                  : 'Aún no enviada al auditor'}
            </span>
            {quote.auditorDispatchStatus === 'ENVIADO' ? (
              <button
                type="button"
                onClick={() => onDispatch('RETIRADO')}
                disabled={isSaving}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-800 transition hover:bg-rose-50 disabled:opacity-60">
                <Undo2 size={13} /> Retirar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onDispatch('ENVIADO')}
                disabled={isSaving}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-sky-800 disabled:opacity-60">
                <Send size={13} /> Mandar a auditor
              </button>
            )}
          </div>
        </section>
      )}

      {/* INFORMACIÓN GENERAL */}
      <section>
        <h3 className="m-0 text-sm font-bold text-slate-900">Información</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt className="text-slate-500">Especialidad</dt>
            <dd className="m-0 mt-0.5 font-semibold text-slate-900">
              {quote.specialty}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Fecha creación</dt>
            <dd className="m-0 mt-0.5 font-semibold text-slate-900">
              {new Date(quote.createdAt).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Proveedor</dt>
            <dd className="m-0 mt-0.5 font-semibold text-slate-900">
              {quote.provider ?? 'Sin proveedor asignado'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Descripción</dt>
            <dd className="m-0 mt-0.5 whitespace-pre-wrap leading-relaxed text-slate-800">
              {quote.description ?? quote.requester ?? 'Sin descripción'}
            </dd>
          </div>
        </dl>
      </section>

      {/* SECCIÓN NOTAS DE ALEXPERTO */}
      <section className="border-t border-slate-200 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={14} className="text-slate-600" />
            <h3 className="m-0 text-xs font-bold text-slate-900">
              Notas de Alexperto
            </h3>
          </div>
          {isLoadingNotes ? (
            <Loader2 size={12} className="animate-spin text-slate-400" />
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
              {notes.length}
            </span>
          )}
        </div>

        {isLoadingNotes ? (
          <div className="mt-2.5 flex items-center justify-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 py-4 text-xs text-slate-500">
            <Loader2 size={13} className="animate-spin text-emerald-800" />
            <span>Consultando notas...</span>
          </div>
        ) : notes.length > 0 ? (
          <div className="mt-2.5 max-h-56 space-y-2 overflow-y-auto pr-1">
            {notes.map(note => (
              <div
                key={note.id}
                className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                    <User size={11} className="text-slate-400" />
                    {note.authorName || note.authorEmail || 'Usuario Alexperto'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(note.createdAt).toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="m-0 mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-center text-xs italic text-slate-400 border border-slate-100">
            Sin notas registradas en Alexperto
          </p>
        )}
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
          rows={4}
          value={auditorComment}
          onChange={event => onAuditorCommentChange(event.target.value)}
          disabled={isSuperadmin}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <label
          htmlFor="paul-comment"
          className="mt-4 block text-xs font-bold text-slate-700">
          Comentario Paul
        </label>
        <textarea
          id="paul-comment"
          rows={4}
          value={paulComment}
          onChange={event => onPaulCommentChange(event.target.value)}
          disabled={!isSuperadmin}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </section>

      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
      <section className="space-y-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => onSave(quote.gemaStatus, false)}
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60">
          <Save size={15} /> {isSaving ? 'Guardando...' : 'Guardar comentarios'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSave('OBSERVADO', true)}
            disabled={isSaving}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-60">
            Observar
          </button>
          <button
            type="button"
            onClick={() => onSave('CULMINADO', true)}
            disabled={isSaving}
            className="rounded-md bg-[#072e27] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
            Culminar
          </button>
          <button
            type="button"
            onClick={() => onSave('PENDIENTE_REVISION', true)}
            disabled={isSaving || quote.gemaStatus === 'PENDIENTE_REVISION'}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-60">
            Pendiente
          </button>
          {isSuperadmin && (
            <button
              type="button"
              onClick={() => onSave('VALIDADO', true)}
              disabled={isSaving}
              className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
              Validar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
