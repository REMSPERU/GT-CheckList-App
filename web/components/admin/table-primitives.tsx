import type { ReactNode } from 'react';

export const TABLE_CLASS = 'w-full min-w-[860px] border-collapse';
export const TH_CLASS =
  'border-b border-slate-100 bg-slate-50 px-[18px] py-3.5 text-left align-top text-xs uppercase tracking-[0.08em] text-slate-500';
export const TD_CLASS =
  'border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]';

interface TableHeadersProps {
  headers: string[];
}

export function TableHeaders({ headers }: TableHeadersProps) {
  return (
    <thead>
      <tr>
        {headers.map(header => (
          <th className={TH_CLASS} key={header}>
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}

interface ResponsiveTableProps {
  children: ReactNode;
}

export function ResponsiveTable({ children }: ResponsiveTableProps) {
  return <div className="overflow-x-auto">{children}</div>;
}
