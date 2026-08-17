import type { ReactNode } from 'react';

export const TABLE_CLASS = 'w-full min-w-full md:min-w-[720px] border-collapse';
export const TH_CLASS =
  'sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs px-4 py-3 text-left align-middle text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-slate-500';
export const TD_CLASS =
  'border-b border-slate-100 px-4 py-3.5 text-left align-middle text-[14.7px] text-[#0c1720] font-medium';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface TableHeadersProps {
  headers: (string | { key: string; label: string; sortable?: boolean })[];
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
}

export function TableHeaders({ headers, sortConfig, onSort }: TableHeadersProps) {
  return (
    <thead>
      <tr>
        {headers.map(header => {
          const isObject = typeof header === 'object';
          const label = isObject ? header.label : header;
          const key = isObject ? header.key : header;
          const isSortable = isObject ? (header.sortable ?? true) : Boolean(onSort);
          const isCurrentSort = sortConfig?.key === key;

          return (
            <th className={TH_CLASS} key={key} scope="col">
              {isSortable && onSort ? (
                <button
                  type="button"
                  onClick={() => onSort(key)}
                  className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-2.5 py-1.5 min-h-[44px] -mx-1"
                  aria-label={`Ordenar por ${label} ${isCurrentSort && sortConfig?.direction === 'asc' ? 'descendente' : 'ascendente'}`}>
                  <span>{label}</span>
                  <span className="text-[0.65rem] text-slate-400 group-hover:text-slate-700" aria-hidden="true">
                    {isCurrentSort ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </button>
              ) : (
                <span>{label}</span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

interface ResponsiveTableProps {
  children: ReactNode;
}

export function ResponsiveTable({ children }: ResponsiveTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}
