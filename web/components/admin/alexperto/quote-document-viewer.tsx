import { Download, ExternalLink, FileText, LoaderCircle } from 'lucide-react';

import { useQuoteDocuments } from '@/hooks/alexperto/use-quote-documents';

interface QuoteDocumentViewerProps {
  quoteId: string;
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
      <div className="flex min-w-0 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 py-1">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1.5">
            {isLoading ? (
              <div className="flex items-center gap-2 p-1 text-xs text-slate-500">
                <LoaderCircle size={15} className="animate-spin" /> Cargando...
              </div>
            ) : documents.length === 0 ? (
              <p className="p-1 text-xs text-slate-500">
                No hay documentos adjuntos en Alexperto.
              </p>
            ) : (
              documents.map(document => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setSelectedDocumentId(document.id)}
                  aria-pressed={selectedDocumentId === document.id}
                  aria-label={`Ver documento ${
                    document.source === 'PROPOSAL' ? 'propuesta' : 'cotización'
                  }`}
                  className={`flex h-8 w-48 shrink-0 items-center gap-1.5 rounded-md border px-2 text-left transition ${
                    selectedDocumentId === document.id
                      ? 'border-emerald-200 bg-emerald-50 text-[#072e27]'
                      : 'border-transparent text-slate-700 hover:bg-slate-100'
                  }`}>
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate text-[11px] font-bold">
                    {document.source === 'PROPOSAL'
                      ? 'Propuesta'
                      : 'Cotización'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
        {documentUrl && selectedDocument && (
          <div className="flex items-center gap-1">
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Abrir documento en otra pestaña"
              title="Abrir en otra pestaña">
              <ExternalLink size={15} />
            </a>
            <a
              href={documentUrl}
              download={selectedDocument.name}
              className="grid h-7 w-7 place-items-center rounded-md bg-[#072e27] text-white transition hover:bg-[#05221d]"
              aria-label={`Descargar ${selectedDocument.name}`}
              title="Descargar">
              <Download size={15} />
            </a>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-[420px] min-w-0 flex-1 bg-slate-200">
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
