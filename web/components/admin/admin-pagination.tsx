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
    <div className="flex items-center justify-end gap-3 border-t border-slate-300 px-[18px] py-3.5 font-bold text-slate-500 max-[640px]:flex-col max-[640px]:items-stretch">
      <button
        className="m-0 h-[38px] w-auto rounded-[10px] border-0 bg-emerald-800 px-3.5 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={page <= 1 || isLoading}
        onClick={() => setPage(current => Math.max(1, current - 1))}>
        Anterior
      </button>
      <span>
        Pagina {page} de {totalPages}
      </span>
      <button
        className="m-0 h-[38px] w-auto rounded-[10px] border-0 bg-emerald-800 px-3.5 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={page >= totalPages || isLoading}
        onClick={() => setPage(current => Math.min(totalPages, current + 1))}>
        Siguiente
      </button>
    </div>
  );
}
