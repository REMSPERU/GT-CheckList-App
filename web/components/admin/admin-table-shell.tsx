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
      className={`overflow-hidden rounded-[22px] border bg-surface shadow-sm ${
        accent ? 'border-primary/40' : 'border-surface-border'
      } ${className}`}>
      <div className="border-b border-surface-border bg-secondary/40 px-4 py-2 text-[0.72rem] font-extrabold uppercase tracking-wider text-text-muted">
        {summary}
      </div>
      {children}
    </section>
  );
}

