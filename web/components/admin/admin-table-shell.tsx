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
      className={`overflow-hidden rounded-[22px] border bg-white/80 shadow-[0_20px_60px_rgba(12,23,32,0.08)] ${
        accent ? 'border-emerald-800/25' : 'border-slate-900/10'
      } ${className}`}>
      <div className="border-b border-slate-200 bg-slate-50/40 px-4 py-2 text-[0.72rem] font-bold uppercase tracking-wider text-slate-500">
        {summary}
      </div>
      {children}
    </section>
  );
}
