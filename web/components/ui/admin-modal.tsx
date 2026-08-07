'use client';

import { type ReactNode, useEffect, useRef } from 'react';
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
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    // Guardar el elemento activo antes de abrir el modal
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Escuchar Escape para cerrar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();

      // Focus trap: mantener foco dentro del modal
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Enfocar el primer elemento del modal
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restaurar foco al elemento previo al cerrar
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm animate-backdrop-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`grid max-h-[calc(100vh-48px)] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-modal-in ${maxWidthClassName}`}>
        <div className="relative overflow-hidden border-b border-[#05221d] bg-[#072e27] px-6 py-5 text-white">
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && (
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-400">
                  {eyebrow}
                </p>
              )}
              <h2
                id="admin-modal-title"
                className="m-0 text-lg font-bold tracking-tight text-white">
                {title}
              </h2>
              {description && (
                <p className="mt-1 max-w-[560px] text-xs font-normal leading-5 text-slate-300">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Cerrar modal">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-t border-slate-900/10 bg-white/70 px-6 py-4">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}
