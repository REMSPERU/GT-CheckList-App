import { type ReactNode, useEffect } from 'react';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  isLoading = false,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500'
      : 'bg-[#072e27] hover:bg-[#05221d] focus-visible:ring-emerald-800';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <p
            id="confirmation-dialog-title"
            className="text-sm font-black uppercase tracking-wider text-slate-900">
            {title}
          </p>
        </div>

        <div className="grid gap-5 px-5 py-5">
          <div className="text-sm font-semibold leading-6 text-slate-600">
            {description}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60">
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              aria-busy={isLoading}
              onClick={onConfirm}
              className={`h-11 rounded-lg px-4 text-sm font-bold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass} ${variant === 'danger' ? 'focus-visible:ring-rose-500' : 'focus-visible:ring-emerald-500'}`}>
              {isLoading ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
