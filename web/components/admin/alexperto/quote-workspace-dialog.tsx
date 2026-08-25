import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { QuoteDocumentViewer } from './quote-document-viewer';
import { QuoteHistoryPanel } from './quote-history-panel';
import { QuoteReviewPanel } from './quote-review-panel';
import type {
  AlexpertoInternalStatus,
  AlexpertoQuoteAuditItem,
} from '@/types/alexperto';

interface QuoteWorkspaceDialogProps {
  quote: AlexpertoQuoteAuditItem | null;
  isSuperadmin: boolean;
  onClose: () => void;
  onStatusUpdate: (input: {
    quoteId: string;
    status: AlexpertoInternalStatus;
    auditorComment: string | null;
    paulComment: string | null;
    recordHistory: boolean;
  }) => Promise<void>;
  onDispatchUpdate: (
    quoteId: string,
    dispatchStatus: 'ENVIADO' | 'RETIRADO',
  ) => Promise<void>;
}

export function QuoteWorkspaceDialog({
  quote,
  isSuperadmin,
  onClose,
  onStatusUpdate,
  onDispatchUpdate,
}: QuoteWorkspaceDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [auditorComment, setAuditorComment] = useState('');
  const [paulComment, setPaulComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!quote) return;
    setAuditorComment(quote.auditorComment ?? '');
    setPaulComment(quote.paulComment ?? '');
    setError(null);
    setNotice(null);
  }, [quote]);

  useEffect(() => {
    if (!quote) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [quote]);

  if (!quote) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  const handleSave = async (
    status: AlexpertoInternalStatus,
    recordHistory: boolean,
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      await onStatusUpdate({
        quoteId: quote.id,
        status,
        auditorComment: auditorComment.trim() || null,
        paulComment: paulComment.trim() || null,
        recordHistory,
      });
      setNotice(
        recordHistory
          ? 'Estado y comentarios actualizados.'
          : 'Comentarios guardados.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudieron guardar los cambios.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispatch = async (dispatchStatus: 'ENVIADO' | 'RETIRADO') => {
    setIsSaving(true);
    setError(null);
    try {
      await onDispatchUpdate(quote.id, dispatchStatus);
      setNotice(
        dispatchStatus === 'ENVIADO'
          ? 'Cotización enviada al auditor del inmueble.'
          : 'Cotización retirada de la bandeja del auditor.',
      );
    } catch (dispatchError) {
      setError(
        dispatchError instanceof Error
          ? dispatchError.message
          : 'No se pudo actualizar el despacho al auditor.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-5">
      <button
        type="button"
        aria-label="Cerrar cotización"
        onClick={onClose}
        className="absolute inset-0 bg-[#061711]/65 backdrop-blur-sm"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-workspace-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f8faf6] shadow-2xl sm:h-[calc(100dvh-40px)] sm:max-w-none sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#05221d] bg-[#072e27] px-4 py-1.5 text-white sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2
              id="quote-workspace-title"
              className="m-0 shrink-0 font-mono text-sm font-bold tracking-tight">
              {quote.code}
            </h2>
            <span aria-hidden="true" className="h-4 w-px bg-emerald-800" />
            <p className="m-0 truncate text-xs text-emerald-100">
              {quote.propertyName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-emerald-900 bg-[#05221d] text-slate-300 transition hover:bg-[#0a3d34] hover:text-white"
            aria-label="Cerrar panel">
            <X size={16} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-[#f8faf6] p-4 lg:border-b-0 lg:border-r">
            <QuoteReviewPanel
              quote={quote}
              isSuperadmin={isSuperadmin}
              auditorComment={auditorComment}
              paulComment={paulComment}
              isSaving={isSaving}
              error={error}
              onAuditorCommentChange={setAuditorComment}
              onPaulCommentChange={setPaulComment}
              onSave={(status, recordHistory) =>
                void handleSave(status, recordHistory)
              }
              onDispatch={dispatchStatus => void handleDispatch(dispatchStatus)}
              onNotice={setNotice}
            />
            {notice && (
              <p className="mt-4 rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white">
                {notice}
              </p>
            )}
            <QuoteHistoryPanel quote={quote} />
          </aside>
          <QuoteDocumentViewer quoteId={quote.id} />
        </div>
      </section>
    </div>
  );
}
