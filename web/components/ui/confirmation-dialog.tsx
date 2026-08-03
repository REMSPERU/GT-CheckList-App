import type { ReactNode } from 'react';
import { Button } from './button';

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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        className="w-full max-w-[420px] overflow-hidden rounded-3xl border border-surface-border bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="border-b border-surface-border bg-secondary/50 px-5 py-4">
          <p
            id="confirmation-dialog-title"
            className="text-xs font-bold uppercase tracking-wider text-text-main">
            {title}
          </p>
        </div>

        <div className="grid gap-5 px-5 py-5">
          <div className="text-sm font-medium leading-6 text-text-muted">
            {description}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              isLoading={isLoading}
              onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === 'danger' ? 'danger' : 'primary'}
              isLoading={isLoading}
              onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
