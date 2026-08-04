import type { ReactNode } from 'react';

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
  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-700 hover:bg-red-800'
      : 'bg-slate-950 hover:bg-emerald-900';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        className="w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
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
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`h-10 rounded-xl px-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}>
              {isLoading ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
