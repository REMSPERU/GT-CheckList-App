import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <section
      className={`flex flex-wrap items-center justify-between gap-4 pb-3.5 border-b border-slate-200/80 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-xl lg:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="m-0 mt-1 text-xs font-medium text-slate-500 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </section>
  );
}


