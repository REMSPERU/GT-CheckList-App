import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck,
  FileText,
  LoaderCircle,
  Receipt,
  Save,
  X,
} from 'lucide-react';
import type { AlexpertoQuoteHistoryItem } from '@/types/alexperto';
import { fetchWithAuth } from '@/services/auth/auth.service';

export interface QuoteItem {
  id: string;
  code: string;
  propertyName: string;
  specialty: string;
  subSpecialty: string;
  externalStatus: string;
  gemaStatus: string;
  amount: string | null;
  createdAt: string;
  hasBeenReviewed: boolean;
  provider: string | null;
  creationUserType?: string | null;
  requester?: string | null;
  description?: string | null;
  serviceCode?: string | null;
  auditorComment: string | null;
  paulComment: string | null;
  history: AlexpertoQuoteHistoryItem[];
}

export function formatExternalStatus(
  status: string | null | undefined,
): string {
  if (!status) return 'Sin estado';
  const trimmed = status.trim();
  const normalized = trimmed.toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    PENDIENTE: 'Pendiente',
    IN_PROGRESS: 'En proceso',
    EN_PROCESO: 'En proceso',
    IN_REVIEW: 'En revisión',
    EN_REVISION: 'En revisión',
    APPROVED: 'Aprobado',
    APROBADO: 'Aprobado',
    REJECTED: 'Rechazado',
    RECHAZADO: 'Rechazado',
    RESOLVED: 'Resuelto',
    RESUELTO: 'Resuelto',
    COMPLETED: 'Culminado',
    CULMINADO: 'Culminado',
    CANCELLED: 'Cancelado',
    CANCELED: 'Cancelado',
    CANCELADO: 'Cancelado',
    SIN_ESTADO: 'Sin estado',
  };
  return map[normalized] ?? trimmed;
}

interface QuoteAuditDrawerProps {
  open: boolean;
  quote: QuoteItem | null;
  onClose: () => void;
  isSuperadmin: boolean;
  onStatusUpdate?: (input: {
    quoteId: string;
    status: string;
    auditorComment: string | null;
    paulComment: string | null;
  }) => Promise<void>;
}

interface QuoteDocument {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  source: 'QUOTE' | 'PROPOSAL';
}

const SPEECH_TEMPLATES = [
  {
    id: 's1',
    title: 'Monto alto (más de S/ 3,000)',
    content:
      'Estimado equipo, la cotización supera los S/ 3,000. Se requiere adjuntar 3 propuestas comparativas y el informe técnico de sustento para proceder.',
  },
  {
    id: 's2',
    title: 'Sin informe técnico',
    content:
      'Se observa la cotización debido a que no cuenta con el informe técnico de diagnóstico previo firmado por la contrata.',
  },
  {
    id: 's3',
    title: 'Conforme sin observaciones',
    content:
      'Cotización revisada por el auditor GEMA. Cuenta con sustento completo y precios acordes al tarifario vigente. Procede ejecución.',
  },
];

export function QuoteAuditDrawer({
  open,
  quote,
  onClose,
  isSuperadmin,
  onStatusUpdate,
}: QuoteAuditDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    'review' | 'documents' | 'history'
  >('review');
  const [auditorComment, setAuditorComment] = useState('');
  const [paulComment, setPaulComment] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [documents, setDocuments] = useState<QuoteDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!quote) return;
    setActiveTab('review');
    setCurrentStatus(quote.gemaStatus);
    setAuditorComment(quote.auditorComment ?? '');
    setPaulComment(quote.paulComment ?? '');
    setNotice(null);
    setSaveError(null);
    setDocuments([]);
    setDocumentsError(null);
  }, [quote]);

  useEffect(() => {
    if (!open || !quote || activeTab !== 'documents') return;
    const quoteId = quote.id;
    let cancelled = false;

    async function loadDocuments() {
      setIsLoadingDocuments(true);
      setDocumentsError(null);
      try {
        const response = await fetchWithAuth(
          `/api/alexperto/cotizaciones/${quoteId}/documentos`,
        );
        if (!response.ok)
          throw new Error('No se pudieron cargar los documentos.');
        const payload = (await response.json()) as { items: QuoteDocument[] };
        if (!cancelled) setDocuments(payload.items);
      } catch (error) {
        if (!cancelled) {
          setDocumentsError(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los documentos.',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingDocuments(false);
      }
    }

    void loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [activeTab, open, quote]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !quote) return null;

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleCopyTemplate = (content: string) => {
    void navigator.clipboard
      .writeText(content)
      .then(() => showNotice('Plantilla copiada al portapapeles.'))
      .catch(() => showNotice('No se pudo copiar la plantilla.'));
  };

  const handleSave = async (status: string) => {
    if (!onStatusUpdate) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onStatusUpdate({
        quoteId: quote.id,
        status,
        auditorComment: auditorComment.trim() || null,
        paulComment: paulComment.trim() || null,
      });
      setCurrentStatus(status);
      showNotice('Cambios guardados en GEMA.');
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openDocument = async (document: QuoteDocument) => {
    setOpeningDocumentId(document.id);
    setDocumentsError(null);
    try {
      const response = await fetchWithAuth(
        `/api/alexperto/cotizaciones/${quote.id}/documentos/${document.id}`,
      );
      if (!response.ok) throw new Error('No se pudo abrir el documento.');
      const payload = (await response.json()) as { url: string };
      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setDocumentsError(
        error instanceof Error
          ? error.message
          : 'No se pudo abrir el documento.',
      );
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const status = currentStatus || quote.gemaStatus;
  const isCompleted = status === 'CULMINADO' || status === 'VALIDADO';
  const formatInternalStatus = (value: string) => {
    if (value === 'PENDIENTE_REVISION') return 'Pendiente';
    if (value === 'VALIDADO') return 'Marcado como revisado';
    return value.charAt(0) + value.slice(1).toLowerCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar panel de revisión"
        className="fixed inset-0 cursor-default bg-[#061711]/65 backdrop-blur-[4px]"
        onClick={onClose}
      />
      <section
        className="relative z-10 flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-[#f8faf6] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-audit-title">
        <header className="border-b border-[#05221d] bg-[#072e27] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#05221d] text-emerald-400">
                <Receipt size={20} />
              </div>
              <div className="min-w-0">
                <h2
                  id="quote-audit-title"
                  className="m-0 font-mono text-xl font-bold tracking-tight">
                  {quote.code}
                </h2>
                <p className="mb-0 mt-1 flex items-center gap-1.5 text-xs text-emerald-100">
                  <Building2 size={13} className="shrink-0 text-emerald-400" />
                  <span className="truncate">{quote.propertyName}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-emerald-900 bg-[#05221d] text-slate-300 transition hover:bg-[#0a3d34] hover:text-white"
              aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>
        </header>

        <nav
          className="flex border-b border-slate-200 bg-white px-6"
          aria-label="Secciones de cotización">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === 'review'
                ? 'border-[#072e27] text-[#072e27]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            Revisión
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === 'documents'
                ? 'border-[#072e27] text-[#072e27]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            Documentos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === 'history'
                ? 'border-[#072e27] text-[#072e27]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            Historial
          </button>
        </nav>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'review' ? (
            <div className="space-y-6">
              <section className="border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="m-0 text-sm font-bold text-slate-900">
                      Estado de revisión
                    </h3>
                    <p className="mb-0 mt-1 text-xs text-slate-500">
                      Estado Alexperto:{' '}
                      {formatExternalStatus(quote.externalStatus)}
                    </p>
                  </div>
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-bold text-emerald-900">
                      <CheckCircle2 size={14} className="text-emerald-700" />
                      {status === 'VALIDADO' ? 'Revisado' : 'Culminado'}
                    </span>
                  ) : status === 'OBSERVADO' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900">
                      <AlertCircle size={14} className="text-amber-700" />
                      Observado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
                      <Clock size={14} />
                      Pendiente
                    </span>
                  )}
                </div>
              </section>

              <section>
                <h3 className="m-0 text-sm font-bold text-slate-900">
                  Información de la cotización
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 text-xs">
                  <div>
                    <dt className="text-slate-500">Especialidad</dt>
                    <dd className="m-0 mt-1 font-semibold text-slate-900">
                      {quote.specialty}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Subespecialidad</dt>
                    <dd className="m-0 mt-1 font-semibold text-slate-900">
                      {quote.subSpecialty}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Proveedor</dt>
                    <dd className="m-0 mt-1 font-semibold text-slate-900">
                      {quote.provider ?? 'Sin proveedor asignado'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Creado por</dt>
                    <dd className="m-0 mt-1 font-semibold text-slate-900">
                      {quote.creationUserType === 'ADMINISTRATOR'
                        ? 'Administrador'
                        : quote.creationUserType === 'PROVIDER'
                          ? 'Proveedor'
                          : (quote.creationUserType ?? 'Administrador')}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Descripción</dt>
                    <dd className="m-0 mt-1 whitespace-pre-wrap leading-relaxed text-slate-800">
                      {quote.description ??
                        quote.requester ??
                        'Sin descripción'}
                    </dd>
                  </div>
                </dl>
              </section>

              {!isSuperadmin && (
                <details className="border-t border-slate-200 pt-5">
                  <summary className="cursor-pointer text-xs font-bold text-[#072e27] marker:text-slate-400">
                    Usar una plantilla de comentario
                  </summary>
                  <div className="mt-3 space-y-2">
                    {SPEECH_TEMPLATES.map(template => (
                      <div
                        key={template.id}
                        className="rounded-lg bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {template.title}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyTemplate(template.content)
                              }
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900">
                              <Copy size={12} /> Copiar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAuditorComment(template.content);
                                showNotice('Plantilla agregada al comentario.');
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-[#072e27] px-2 py-1 text-[11px] font-bold text-white transition hover:bg-[#05221d]">
                              <FileCheck
                                size={12}
                                className="text-emerald-300"
                              />{' '}
                              Usar
                            </button>
                          </div>
                        </div>
                        <p className="mb-0 mt-2 text-xs leading-relaxed text-slate-600">
                          {template.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <section className="border-t border-slate-200 pt-5">
                <h3 className="m-0 text-sm font-bold text-slate-900">
                  Comentarios
                </h3>
                <div className="mt-3 space-y-4">
                  <div>
                    <label
                      htmlFor="auditor-comment"
                      className="block text-xs font-bold text-slate-700">
                      Comentario del auditor asignado
                    </label>
                    <p className="mb-2 mt-1 text-xs text-slate-500">
                      {isSuperadmin
                        ? 'Solo lectura. Lo registra el auditor responsable del inmueble.'
                        : 'Registra la observación, sustento o siguiente acción.'}
                    </p>
                    <textarea
                      id="auditor-comment"
                      rows={5}
                      value={auditorComment}
                      onChange={event => setAuditorComment(event.target.value)}
                      disabled={isSuperadmin}
                      placeholder="Escribe el comentario del auditor..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="paul-comment"
                      className="block text-xs font-bold text-slate-700">
                      Comentario Paul
                    </label>
                    <p className="mb-2 mt-1 text-xs text-slate-500">
                      {isSuperadmin
                        ? 'Registra la decisión o indicación de la revisión final.'
                        : 'Solo los superadministradores pueden registrar este comentario.'}
                    </p>
                    <textarea
                      id="paul-comment"
                      rows={5}
                      value={paulComment}
                      onChange={event => setPaulComment(event.target.value)}
                      disabled={!isSuperadmin}
                      placeholder="Escribe el comentario de revisión final..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </section>

              {notice && (
                <p className="m-0 rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white">
                  {notice}
                </p>
              )}
            </div>
          ) : activeTab === 'documents' ? (
            <section>
              <h3 className="m-0 text-sm font-bold text-slate-900">
                Documentos de la cotización
              </h3>
              <p className="mb-0 mt-1 text-xs leading-relaxed text-slate-500">
                Los enlaces se generan al abrir cada archivo y vencen en cinco
                minutos.
              </p>
              {documentsError && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {documentsError}
                </p>
              )}
              {isLoadingDocuments ? (
                <div className="flex items-center gap-2 py-8 text-xs text-slate-500">
                  <LoaderCircle size={16} className="animate-spin" />
                  Cargando documentos...
                </div>
              ) : documents.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  No hay documentos adjuntos en Alexperto.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {documents.map(document => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => void openDocument(document)}
                      disabled={openingDocumentId !== null}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-60">
                      <FileText size={18} className="shrink-0 text-[#0b5b4e]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900">
                          {document.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          {document.source === 'PROPOSAL'
                            ? 'Propuesta'
                            : 'Cotización'}{' '}
                          ·{' '}
                          {new Date(document.createdAt).toLocaleDateString(
                            'es-PE',
                          )}
                        </span>
                      </span>
                      {openingDocumentId === document.id ? (
                        <LoaderCircle
                          size={16}
                          className="animate-spin text-slate-500"
                        />
                      ) : (
                        <ExternalLink
                          size={16}
                          className="shrink-0 text-slate-500"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="text-xs">
              <h3 className="m-0 text-sm font-bold text-slate-900">
                Historial de auditoría
              </h3>
              <div className="mt-5 border-l-2 border-slate-200 pl-4">
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
              </div>
            </section>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-4">
          {saveError && (
            <p className="mb-3 text-xs font-medium text-red-700">{saveError}</p>
          )}
          <button
            type="button"
            onClick={() => handleSave(status)}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
            <Save size={15} />
            {isSaving ? 'Guardando...' : 'Guardar comentarios'}
          </button>
          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Guardar y cambiar estado
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSave('PENDIENTE_REVISION')}
              disabled={isSaving || status === 'PENDIENTE_REVISION'}
              className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
              Volver a pendiente
            </button>
            <button
              type="button"
              onClick={() => handleSave('OBSERVADO')}
              disabled={isSaving}
              className="flex-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
              Observar
            </button>
            <button
              type="button"
              onClick={() => handleSave('CULMINADO')}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-[#072e27] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#05221d] disabled:cursor-not-allowed disabled:opacity-60">
              Culminar
            </button>
            {isSuperadmin && (
              <button
                type="button"
                onClick={() => handleSave('VALIDADO')}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                Marcar revisado
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
