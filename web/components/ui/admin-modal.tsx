import type { ReactNode } from 'react';

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#061711]/65 px-4 py-6 backdrop-blur-[5px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`grid max-h-[calc(100vh-48px)] w-full overflow-hidden rounded-[28px] border border-white/60 bg-[#f8faf6] shadow-[0_34px_120px_rgba(2,18,14,0.38)] ${maxWidthClassName}`}>
        <div className="relative overflow-hidden border-b border-emerald-950/10 bg-[radial-gradient(circle_at_0%_0%,rgba(190,242,100,0.45),transparent_34%),linear-gradient(135deg,#07352f_0%,#0b1f28_76%)] px-6 py-5 text-white">
          <div className="absolute right-[-42px] top-[-70px] h-36 w-36 rounded-full border border-lime-200/20" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && (
                <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.22em] text-lime-200">
                  {eyebrow}
                </p>
              )}
              <h2
                id="admin-modal-title"
                className="m-0 text-2xl font-black tracking-[-0.05em]">
                {title}
              </h2>
              {description && (
                <p className="mt-2 max-w-[560px] text-sm font-semibold leading-6 text-emerald-50/80">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-xl font-black leading-none text-white transition hover:bg-white/20"
              aria-label="Cerrar modal">
              x
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
