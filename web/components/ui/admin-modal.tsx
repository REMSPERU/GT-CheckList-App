import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  open: boolean;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  onClose: () => void;
}

export function AdminModal({
  open,
  title,
  eyebrow,
  description,
  children,
  footer,
  maxWidthClassName = 'max-w-[720px]',
  onClose,
}: AdminModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-[5px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`grid max-h-[calc(100vh-48px)] w-full overflow-hidden rounded-[28px] border border-surface-border bg-surface shadow-[0_34px_120px_rgba(2,18,14,0.38)] ${maxWidthClassName}`}>
        <div className="relative overflow-hidden border-b border-surface-border bg-gradient-to-r from-sidebar-from to-sidebar-to px-6 py-5 text-white">
          <div className="absolute right-[-42px] top-[-70px] h-36 w-36 rounded-full border border-accent/20" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && (
                <p className="mb-1 text-[0.68rem] font-extrabold uppercase tracking-[0.22em] text-accent">
                  {eyebrow}
                </p>
              )}
              <h2
                id="admin-modal-title"
                className="m-0 text-2xl font-black tracking-[-0.05em] text-white">
                {title}
              </h2>
              {description && (
                <p className="mt-2 max-w-[560px] text-sm font-medium leading-6 text-sidebar-text/80">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Cerrar modal">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-t border-surface-border bg-secondary/40 px-6 py-4">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}

