import { Download, ExternalLink, FileText, LoaderCircle } from 'lucide-react';

import { useQuoteDocuments } from '@/hooks/alexperto/use-quote-documents';

interface QuoteDocumentViewerProps {
  quoteId: string;
}

function formatFileSize(size: number | null) {
  if (!size) return null;
  return `${(size / 1024 / 1024).toFixed(size >= 10_485_760 ? 0 : 1)} MB`;
}

export function QuoteDocumentViewer({ quoteId }: QuoteDocumentViewerProps) {
  const {
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    documentUrl,
    isLoading,
    isLoadingDocument,
    error,
  } = useQuoteDocuments(quoteId);
  const selectedDocument = documents.find(
    document => document.id === selectedDocumentId,
  );

  return (
    <section className="flex min-h-0 flex-col overflow-hidden bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h3 className="m-0 text-sm font-bold text-slate-900">Documentos</h3>
          <p className="mb-0 mt-0.5 text-xs text-slate-500">
            Selecciona un archivo para revisarlo sin salir de la cotización.
          </p>
        </div>
        {documentUrl && selectedDocument && (
          <div className="flex items-center gap-1">
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              <ExternalLink size={14} /> Abrir
            </a>
            <a
              href={documentUrl}
              download={selectedDocument.name}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#072e27] px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#05221d]">
              <Download size={14} /> Descargar
            </a>
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-3 lg:border-b-0 lg:border-r">
          {isLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
              <LoaderCircle size={15} className="animate-spin" /> Cargando...
            </div>
          ) : documents.length === 0 ? (
            <p className="p-3 text-xs leading-relaxed text-slate-500">
              No hay documentos adjuntos en Alexperto.
            </p>
          ) : (
            <div className="space-y-1">
              {documents.map(document => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setSelectedDocumentId(document.id)}
                  className={`flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition ${
                    selectedDocumentId === document.id
                      ? 'bg-emerald-50 text-[#072e27]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}>
                  <FileText size={16} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">
                      {document.name}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {document.source === 'PROPOSAL'
                        ? 'Propuesta'
                        : 'Cotización'}
                      {formatFileSize(document.size)
                        ? ` · ${formatFileSize(document.size)}`
                        : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="relative min-h-[420px] bg-slate-200">
          {isLoadingDocument && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100/80 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-2">
                <LoaderCircle size={17} className="animate-spin" /> Cargando
                PDF...
              </span>
            </div>
          )}
          {error ? (
            <div className="grid h-full min-h-[420px] place-items-center p-6 text-center">
              <p className="max-w-xs text-sm text-red-700">{error}</p>
            </div>
          ) : documentUrl ? (
            <iframe
              key={documentUrl}
              src={documentUrl}
              title={selectedDocument?.name ?? 'Documento de cotización'}
              className="h-full min-h-[420px] w-full border-0"
            />
          ) : (
            <div className="grid h-full min-h-[420px] place-items-center p-6 text-center text-sm text-slate-500">
              Selecciona un documento para previsualizarlo.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
