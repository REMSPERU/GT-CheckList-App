import { useEffect, useState } from 'react';

import type { AdminChecklistScheduleRow } from '@/types/admin';

const PAGE_SIZE = 12;

interface ChecklistScheduleMatrixProps {
  schedules: AdminChecklistScheduleRow[];
  selectedScheduleId: string | null;
  onOpenSchedule: (schedule: AdminChecklistScheduleRow) => void;
}

export function ChecklistScheduleMatrix({
  schedules,
  selectedScheduleId,
  onOpenSchedule,
}: ChecklistScheduleMatrixProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(schedules.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleSchedules = schedules.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(current => Math.min(current, totalPages));
  }, [totalPages]);

  if (schedules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
        No hay programaciones para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.11em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Inmueble</th>
              <th className="px-4 py-3">Sistema / activo</th>
              <th className="px-4 py-3 text-center">Equipos</th>
              <th className="px-4 py-3">Regla</th>
              <th className="px-4 py-3">Vigencia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {visibleSchedules.map(schedule => (
              <tr
                className={`border-t border-slate-100 transition hover:bg-emerald-50/45 ${
                  selectedScheduleId === schedule.id ? 'bg-emerald-50/70' : ''
                }`}
                key={schedule.id}>
                <td className="px-4 py-3 align-top">
                  <strong className="block text-sm text-slate-950">
                    {schedule.propertyName}
                  </strong>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="block text-xs font-black uppercase tracking-[0.1em] text-emerald-800">
                    {schedule.systemName}
                  </span>
                  <strong className="mt-1 block text-sm text-slate-800">
                    {schedule.equipmentName}
                  </strong>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <strong className="inline-flex min-w-9 justify-center rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-900">
                    {schedule.equipmentCount}
                  </strong>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    activos cubiertos
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-sm text-slate-700">
                  <strong className="block">{schedule.frequency}</strong>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    {schedule.occurrences_per_day} registro(s) ·{' '}
                    {formatTime(schedule.window_start)} -{' '}
                    {formatTime(schedule.window_end)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-xs font-semibold text-slate-600">
                  <span className="block">
                    Desde {formatDate(schedule.start_date)}
                  </span>
                  <span className="mt-1 block">
                    Hasta {formatDate(schedule.end_date)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                      schedule.is_active
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                    {schedule.is_active ? 'Activa' : 'Pausada'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <button
                    className="min-h-9 rounded-xl bg-slate-950 px-3 text-xs font-black text-white hover:bg-emerald-900"
                    type="button"
                    onClick={() => onOpenSchedule(schedule)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
        <span>
          Mostrando {start + 1}-{Math.min(start + PAGE_SIZE, schedules.length)}{' '}
          de {schedules.length} reglas
        </span>
        <div className="flex items-center gap-2">
          <button
            className="min-h-8 rounded-lg border border-slate-200 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}>
            Anterior
          </button>
          <span>
            Pág. {safePage} de {totalPages}
          </span>
          <button
            className="min-h-8 rounded-lg border border-slate-200 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatDate(value: string | null) {
  if (!value) return 'Sin fin';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
