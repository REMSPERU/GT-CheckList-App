import type { ReactNode } from 'react';

interface AdminTableShellProps {
  summary: string;
  children: ReactNode;
  accent?: boolean;
  className?: string;
}

export function AdminTableShell({
  summary,
  children,
  accent = false,
  className = '',
}: AdminTableShellProps) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col min-h-0 ${className}`}>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600 shrink-0">
        {summary}
      </div>
      {children}
    </section>
  );
}
