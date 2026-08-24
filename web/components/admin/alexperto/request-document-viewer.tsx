import {
  AlertTriangle,
  Bot,
  Download,
  ExternalLink,
  FileText,
  FileX2,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useRequestDocuments } from '@/hooks/alexperto/use-request-documents';
import { useTechnicalReportSummary } from '@/hooks/alexperto/use-technical-report-summary';
import type { TechnicalReportSummary } from '@/types/alexperto';

interface RequestDocumentViewerProps {
  requestId: string;
}

function formatFileSize(size: number | null) {
  if (!size) return null;
  return `${(size / 1024 / 1024).toFixed(size >= 10_485_760 ? 0 : 1)} MB`;
}

function isTechnicalReport(typeName: string) {
  return (
    typeName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase() === 'informes tecnicos'
  );
}

function processingLabel(stage: string | null, elapsedSeconds: number) {
  if (stage === 'EXTRACTING') return 'Extrayendo texto del PDF...';
  if (stage === 'ANALYZING') return 'Analizando hallazgos con IA...';
  if (stage === 'CONSOLIDATING') return 'Consolidando hallazgos del informe...';
  if (elapsedSeconds < 5) return 'Preparando el informe para el análisis...';
  return 'Esperando respuesta del modelo gratuito...';
}

function summaryText(summary: TechnicalReportSummary) {
  if ('markdown' in summary) return summary.markdown;
  return [
    '## Resumen ejecutivo',
    summary.executiveSummary,
    '## Hallazgos',
    ...summary.findings.map(
      finding =>
        `### ${finding.criticality} | Página ${finding.page} | ${finding.title}\nEvidencia: ${finding.evidence}\nImpacto: ${finding.impact}\nRecomendación: ${finding.recommendation}`,
    ),
  ].join('\n\n');
}

function MarkdownSummary({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h4 className="m-0 text-base font-bold tracking-tight text-slate-950">
            {children}
          </h4>
        ),
        h2: ({ children }) => (
          <h5 className="mt-5 border-b border-slate-200 pb-2 text-sm font-bold text-[#072e27] first:mt-0">
            {children}
          </h5>
        ),
        h3: ({ children }) => (
          <h6 className="mt-4 text-xs font-bold text-slate-900">{children}</h6>
        ),
        p: ({ children }) => (
          <p className="my-2 text-xs leading-5 text-slate-700">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-700">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-700">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-bold text-slate-900">{children}</strong>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l border-emerald-500 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-md bg-slate-900 p-3 text-[11px] leading-5 text-slate-100">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[11px] text-slate-700">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-slate-200 bg-slate-50 px-2 py-1.5 font-bold text-slate-800">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-slate-200 px-2 py-1.5 align-top">
            {children}
          </td>
        ),
      }}>
      {children}
    </ReactMarkdown>
  );
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
  const technicalDocument =
    selectedDocument?.mimeType?.toLowerCase() === 'application/pdf' &&
    isTechnicalReport(selectedDocument.typeName);
  const summary = useTechnicalReportSummary(
    requestId,
    selectedDocumentId,
    Boolean(technicalDocument),
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
            <div
              className={`grid h-full min-h-[420px] ${
                technicalDocument
                  ? 'xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]'
                  : ''
              }`}>
              <iframe
                key={documentUrl}
                src={documentUrl}
                title={selectedDocument?.name ?? 'Documento de solicitud'}
                className="min-h-[420px] h-full w-full border-0"
              />
              {technicalDocument && (
                <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white xl:border-l xl:border-t-0">
                  <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <span className="flex items-center gap-2 text-xs font-bold text-[#072e27]">
                      <Bot size={15} /> Resumen técnico IA
                    </span>
                    {summary.result?.status === 'COMPLETED' && (
                      <span className="max-w-32 truncate text-right text-[10px] font-medium text-slate-500">
                        {summary.result.model ?? 'Modelo no disponible'}
                      </span>
                    )}
                  </header>
                  <div className="p-4">
                    {summary.isLoading ? (
                      <p className="m-0 flex items-center gap-2 text-xs text-slate-500">
                        <LoaderCircle size={14} className="animate-spin" />{' '}
                        Consultando resumen...
                      </p>
                    ) : summary.isGenerating ? (
                      <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                        <p className="m-0 flex items-center gap-2 font-bold">
                          <LoaderCircle size={14} className="animate-spin" />
                          {processingLabel(
                            summary.result?.processingStage ?? null,
                            summary.elapsedSeconds,
                          )}
                        </p>
                        <p className="mb-0 mt-1.5 text-emerald-800">
                          {summary.elapsedSeconds}s transcurridos. Los modelos
                          gratuitos pueden demorar por cola o disponibilidad.
                        </p>
                      </div>
                    ) : summary.error ? (
                      <div className="flex items-center justify-between gap-3 text-xs text-red-700">
                        <span>{summary.error}</span>
                        <button
                          type="button"
                          onClick={() => void summary.generate()}
                          disabled={summary.isGenerating}
                          className="shrink-0 rounded-md border border-red-200 px-2 py-1 font-bold">
                          Reintentar
                        </button>
                      </div>
                    ) : summary.result?.status === 'FAILED' ? (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                        <span>
                          {summary.result.errorMessage ??
                            'No se pudo completar el análisis del informe.'}
                          {summary.result.attemptCount > 0 &&
                            ` (${summary.result.attemptCount} intento${summary.result.attemptCount === 1 ? '' : 's'}).`}
                        </span>
                        <button
                          type="button"
                          onClick={() => void summary.generate(true)}
                          disabled={summary.isGenerating}
                          className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 font-bold disabled:opacity-50">
                          Reintentar
                        </button>
                      </div>
                    ) : summary.result?.status === 'COMPLETED' &&
                      summary.result.summary ? (
                      <div className="space-y-3 text-xs text-slate-700">
                        <p className="m-0 rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                          Resultado asistido por IA. Verifica la evidencia en el
                          informe original.
                        </p>
                        <p className="m-0 text-[10px] text-slate-500">
                          {summary.result.model ?? 'Modelo no disponible'}
                          {summary.result.attemptCount > 0 &&
                            ` · ${summary.result.attemptCount} intento${summary.result.attemptCount === 1 ? '' : 's'}`}
                        </p>
                        <MarkdownSummary>
                          {summaryText(summary.result.summary)}
                        </MarkdownSummary>
                        <button
                          type="button"
                          onClick={() => void summary.generate(true)}
                          disabled={summary.isGenerating}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50">
                          <RefreshCw
                            size={13}
                            className={
                              summary.isGenerating ? 'animate-spin' : ''
                            }
                          />{' '}
                          Regenerar resumen
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <p className="m-0 text-xs text-slate-600">
                          Analiza este informe para identificar hallazgos
                          verificables por página.
                        </p>
                        <button
                          type="button"
                          onClick={() => void summary.generate()}
                          disabled={summary.isGenerating}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#072e27] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                          {summary.isGenerating ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <AlertTriangle size={14} />
                          )}{' '}
                          Analizar informe con IA
                        </button>
                      </div>
                    )}
                  </div>
                </aside>
              )}
            </div>
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
