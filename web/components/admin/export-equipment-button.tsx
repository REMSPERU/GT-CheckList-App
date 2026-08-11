'use client';

import { useState, useRef, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentsForExport } from '@/services/admin/equipments.service';
import { exportEquipmentsToExcel } from '@/lib/export-equipment-excel';
import type { AdminEquipmentFilters } from '@/types/admin';

interface ExportEquipmentButtonProps {
  filters: Omit<AdminEquipmentFilters, 'page' | 'pageSize'>;
  activeFilterCount?: number;
}

export function ExportEquipmentButton({
  filters,
  activeFilterCount = 0,
}: ExportEquipmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setExportError(null);

    try {
      const supabase = getSupabaseClient();
      const rows = await listAdminEquipmentsForExport(supabase, filters);

      // Build active filters summary text
      const summaryParts: string[] = [];
      if (filters.search) summaryParts.push(`Búsqueda: "${filters.search}"`);
      if (filters.status && filters.status !== 'TODOS')
        summaryParts.push(`Estado: ${filters.status}`);
      if (filters.config && filters.config !== 'TODOS')
        summaryParts.push(`Configuración: ${filters.config}`);

      const filterSummary =
        summaryParts.length > 0
          ? summaryParts.join(' | ')
          : 'Todos los activos sin restricciones';

      await exportEquipmentsToExcel(rows, filterSummary);
      setIsOpen(false);
    } catch (err: unknown) {
      console.error('Error al exportar activos a Excel:', err);
      setExportError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al generar la exportación.',
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        disabled={isExportingExcel}
        className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition-all hover:bg-emerald-50/50 hover:border-emerald-700/40 hover:text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 disabled:opacity-60">
        {isExportingExcel ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-emerald-800" />
            <span>Exportando...</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4 text-emerald-800"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <span>Exportar</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Formato de Exportación
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition-colors hover:bg-emerald-50 hover:text-emerald-950 disabled:opacity-50">
            <div className="flex items-center gap-2.5">
              <svg
                className="h-5 w-5 text-emerald-700"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              <span>Excel (.xlsx)</span>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Listo
            </span>
          </button>

          <button
            type="button"
            disabled
            title="La exportación a PDF estará disponible próximamente"
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-400 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-2.5">
              <svg
                className="h-5 w-5 text-red-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5-3h7.5M12 3v5.25c0 .621.504 1.125 1.125 1.125h5.25"
                />
              </svg>
              <span>PDF (.pdf)</span>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              Próximamente
            </span>
          </button>

          {exportError && (
            <p className="mt-2 px-3 py-1.5 text-xs text-red-600 font-medium border-t border-slate-100">
              {exportError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
