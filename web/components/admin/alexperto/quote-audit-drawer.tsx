import { useEffect, useRef, useState } from 'react';
import {
  X,
  Receipt,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Sparkles,
  FileCheck,
} from 'lucide-react';

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
}

interface QuoteAuditDrawerProps {
  open: boolean;
  quote: QuoteItem | null;
  onClose: () => void;
  onStatusUpdate?: (quoteId: string, newStatus: string, note?: string) => void;
}

const SPEECH_TEMPLATES = [
  {
    id: 's1',
    title: 'Monto alto (> S/ 3,000)',
    content:
      'Estimado equipo, la cotización supera los S/ 3,000. Se requiere adjuntar 3 propuestas comparativas y el informe técnico de sustento para proceder.',
  },
  {
    id: 's2',
    title: 'Sin Informe Técnico',
    content:
      'Se observa la cotización debido a que no cuenta con el informe técnico de diagnóstico previo firmado por la contrata.',
  },
  {
    id: 's3',
    title: 'Aprobado sin observaciones',
    content:
      'Cotización revisada por el auditor GEMA. Cuenta con sustento completo y precios acordes al tarifario vigente. Procede ejecución.',
  },
];

export function QuoteAuditDrawer({
  open,
  quote,
  onClose,
  onStatusUpdate,
}: QuoteAuditDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<
    'details' | 'speeches' | 'history'
  >('details');
  const [selectedSpeech, setSelectedSpeech] = useState<string>('');
  const [auditNote, setAuditNote] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  useEffect(() => {
    if (quote) {
      setCurrentStatus(quote.gemaStatus);
      setAuditNote('');
      setSelectedSpeech('');
      setActiveTab('details');
    }
  }, [quote]);

  // Esc key listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !quote) return null;

  const handleCopySpeech = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleApplyStatus = (newStatus: string) => {
    setCurrentStatus(newStatus);
    if (onStatusUpdate) {
      onStatusUpdate(quote.id, newStatus, auditNote || selectedSpeech);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#061711]/65 backdrop-blur-[4px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <section
        ref={drawerRef}
        className="relative z-10 flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-[#f8faf6] shadow-2xl"
        role="dialog"
        aria-modal="true">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-[#05221d] bg-[#072e27] px-6 py-5 text-white">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono font-bold text-sm">
                <Receipt size={20} />
              </div>
              <div>
                <p className="mb-0.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-emerald-400">
                  Auditoría Alexperto · Cotizaciones
                </p>
                <h2 className="m-0 text-xl font-bold tracking-tight">
                  {quote.code}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-900/60 bg-[#05221d] text-slate-300 transition hover:bg-[#0a3d34] hover:text-white"
              aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>

          {/* Subheader info badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 font-medium text-slate-200 backdrop-blur-xs">
              <Building2 size={12} className="text-emerald-400" />
              {quote.propertyName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/80 border border-emerald-800/40 px-2.5 py-1 font-semibold text-emerald-300">
              S/ {quote.amount ?? 'Sin monto'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition ${
              activeTab === 'details'
                ? 'border-[#072e27] text-[#072e27]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            Detalle Cotización
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('speeches')}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition ${
              activeTab === 'speeches'
                ? 'border-[#072e27] text-[#072e27]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            Speeches y Observaciones
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`border-b-2 py-3 px-4 text-xs font-bold transition ${
              activeTab === 'history'
                ? 'border-[#072e27] text-[#072e27]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            Historial de Auditoría
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {activeTab === 'details' && (
            <div className="grid gap-4">
              {/* Status summary banner */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Estado Actual de Auditoría GEMA
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentStatus === 'CULMINADO' ||
                    currentStatus === 'VALIDADO' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 border border-emerald-300">
                        <CheckCircle2 size={15} className="text-emerald-700" />
                        Culminado / Validado
                      </span>
                    ) : currentStatus === 'OBSERVADO' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 border border-amber-300">
                        <AlertCircle size={15} className="text-amber-700" />
                        Observado por Auditor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 border border-slate-300">
                        <Clock size={15} className="text-slate-600" />
                        Pendiente de Revisión
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Alexperto:{' '}
                    <strong className="text-slate-800">
                      {quote.externalStatus}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Information Cards Grid */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0">
                  Información Técnica del Trabajo
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">
                      Especialidad
                    </span>
                    <span className="font-bold text-slate-900">
                      {quote.specialty}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">
                      Sub-Especialidad
                    </span>
                    <span className="font-bold text-slate-900">
                      {quote.subSpecialty}
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-slate-100 pt-2.5">
                    <span className="text-slate-400 block font-medium">
                      Proveedor Asignado
                    </span>
                    <span className="font-bold text-slate-900">
                      {quote.provider ?? 'No informado'}
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-slate-100 pt-2.5">
                    <span className="text-slate-400 block font-medium">
                      Inmueble GEMA Mapeado
                    </span>
                    <span className="font-bold text-slate-900">
                      {quote.propertyName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount alert if > 3000 */}
              {quote.amount !== null && Number(quote.amount) >= 3000 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
                  <Sparkles
                    size={18}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="font-bold m-0 text-amber-950">
                      Monto Relevante de Auditoría (&gt; S/ 3,000)
                    </p>
                    <p className="m-0 mt-1 text-[11px] text-amber-800 leading-relaxed">
                      Esta cotización por S/ {quote.amount} requiere
                      verificación del informe técnico y confirmación de
                      tarifario antes de marcar como Culminado.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'speeches' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0 mb-3">
                  Plantillas de Observación Rápida (Speeches)
                </h3>
                <div className="space-y-2.5">
                  {SPEECH_TEMPLATES.map(tpl => (
                    <div
                      key={tpl.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 hover:bg-slate-100/60 transition">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          {tpl.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSpeech(tpl.content);
                            setAuditNote(tpl.content);
                            handleCopySpeech(tpl.content);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 px-2 py-0.5 rounded transition">
                          <Copy size={12} />
                          <span>Copiar</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 m-0 leading-relaxed font-normal">
                        {tpl.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Note Area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Comentario Personalizado de Auditoría
                </label>
                <textarea
                  rows={4}
                  value={auditNote}
                  onChange={e => setAuditNote(e.target.value)}
                  placeholder="Escribe aquí las observaciones o sustento de auditoría..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {copiedSuccess && (
                <div className="rounded-lg bg-emerald-950 text-white px-3 py-2 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Speech copiado al portapapeles con éxito</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0">
                Trazabilidad de Acciones GEMA
              </h3>
              <div className="relative border-l-2 border-slate-200 ml-2 pl-4 py-1 space-y-4 text-xs">
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white" />
                  <p className="font-bold text-slate-900 m-0">
                    Registro de Cotización importado de Alexperto
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {new Date(quote.createdAt).toLocaleString('es-PE')}
                  </span>
                </div>
                {currentStatus !== 'PENDIENTE_REVISION' && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full bg-amber-500 border-2 border-white" />
                    <p className="font-bold text-slate-900 m-0">
                      Estado cambiado a {currentStatus}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Hoy, por Auditor GEMA
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Audit Actions */}
        <div className="border-t border-slate-200 bg-white px-6 py-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => handleApplyStatus('OBSERVADO')}
            className="flex-1 min-w-[130px] rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 flex items-center justify-center gap-1.5">
            <AlertCircle size={15} className="text-amber-700" />
            <span>Observar</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyStatus('CULMINADO')}
            className="flex-1 min-w-[150px] rounded-lg bg-[#072e27] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#05221d] flex items-center justify-center gap-1.5 shadow-xs">
            <FileCheck size={15} className="text-emerald-400" />
            <span>Culminar Auditoría</span>
          </button>
        </div>
      </section>
    </div>
  );
}
