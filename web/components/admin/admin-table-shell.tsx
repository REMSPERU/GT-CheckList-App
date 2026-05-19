import type { ReactNode } from 'react';

interface AdminTableShellProps {
  summary: string;
  children: ReactNode;
  accent?: boolean;
}

export function AdminTableShell({
  summary,
  children,
  accent = false,
}: AdminTableShellProps) {
  return (
    <section
      className={`overflow-hidden rounded-[22px] border bg-white/80 shadow-[0_20px_60px_rgba(12,23,32,0.08)] ${
        accent ? 'border-emerald-800/25' : 'border-slate-900/10'
      }`}>
      <div className="border-b border-slate-300 px-[18px] py-4 font-bold text-slate-500">
        {summary}
      </div>
      {children}
    </section>
  );
}
