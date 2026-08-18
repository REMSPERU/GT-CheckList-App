import {
  Download,
  ExternalLink,
  FileText,
  FileX2,
  LoaderCircle,
} from 'lucide-react';

import { useRequestDocuments } from '@/hooks/alexperto/use-request-documents';

interface RequestDocumentViewerProps {
  requestId: string;
}

function formatFileSize(size: number | null) {
  if (!size) return null;
  return `${(size / 1024 / 1024).toFixed(size >= 10_485_760 ? 0 : 1)} MB`;
}

export function RequestDocumentViewer({
  requestId,
}: RequestDocumentViewerProps) {
  const {
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    documentUrl,
    isLoading,
    isLoadingDocument,
    error,
  } = useRequestDocuments(requestId);
  const selectedDocument = documents.find(
    document => document.id === selectedDocumentId,
  );
  const documentsByType = documents.reduce((groups, document) => {
    const group = groups.get(document.typeName) ?? [];
    group.push(document);
    groups.set(document.typeName, group);
    return groups;
  }, new Map<string, typeof documents>());

  if (!isLoading && !error && documents.length === 0) {
    return (
      <section className="flex min-h-0 flex-col overflow-hidden bg-white">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="m-0 text-sm font-bold text-slate-900">Documentos</h3>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Sin adjuntos
          </span>
        </header>
        <div className="grid min-h-[420px] flex-1 place-items-center p-8">
          <div className="max-w-sm text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <FileX2 size={23} strokeWidth={1.8} />
            </div>
            <h4 className="mt-4 text-sm font-bold text-slate-900">
              Esta solicitud no tiene documentos
            </h4>
            <p className="m-0 mt-1.5 text-xs leading-relaxed text-slate-500">
              Cuando Alexperto adjunte archivos, podrás consultarlos y
              descargarlos desde aquí.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden bg-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <h3 className="m-0 text-sm font-bold text-slate-900">Documentos</h3>
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
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-2 lg:border-b-0 lg:border-r">
          {isLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
              <LoaderCircle size={15} className="animate-spin" /> Cargando...
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(documentsByType).map(([typeName, typeDocuments]) => (
                <section key={typeName} aria-label={typeName}>
                  <h4 className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {typeName}
                  </h4>
                  <div className="space-y-1">
                    {typeDocuments.map(document => (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => setSelectedDocumentId(document.id)}
                        className={`flex w-full items-start gap-2 rounded-md p-2 text-left transition ${
                          selectedDocumentId === document.id
                            ? 'bg-emerald-50 text-[#072e27]'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}>
                        <FileText size={15} className="mt-0.5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold">
                            {document.name}
                          </span>
                          {formatFileSize(document.size) && (
                            <span className="mt-0.5 block text-[10px] text-slate-500">
                              {formatFileSize(document.size)}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </aside>

        <div className="relative min-h-[420px] bg-slate-200">
          {isLoadingDocument && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100/80 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-2">
                <LoaderCircle size={17} className="animate-spin" /> Cargando
                documento...
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
              title={selectedDocument?.name ?? 'Documento de solicitud'}
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
