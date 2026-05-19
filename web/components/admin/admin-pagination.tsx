import type { Dispatch, SetStateAction } from 'react';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  isLoading: boolean;
  setPage: Dispatch<SetStateAction<number>>;
}

export function AdminPagination({
  page,
  totalPages,
  isLoading,
  setPage,
}: AdminPaginationProps) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/30 px-4 py-2 text-xs font-medium text-slate-500">
      <button
        className="m-0 h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        type="button"
        disabled={page <= 1 || isLoading}
        onClick={() => setPage(current => Math.max(1, current - 1))}>
        Anterior
      </button>
      <span className="px-2 text-[0.82rem] font-semibold text-slate-600">
        Pág. {page} de {totalPages}
      </span>
      <button
        className="m-0 h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        type="button"
        disabled={page >= totalPages || isLoading}
        onClick={() => setPage(current => Math.min(totalPages, current + 1))}>
        Siguiente
      </button>
    </div>
  );
}
