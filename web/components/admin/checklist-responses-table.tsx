import type { ReactNode } from 'react';
import Link from 'next/link';

import type { AdminChecklistResponseRow } from '@/types/admin';
import {
  formatWeight,
  getChecklistWeightedScore,
} from '@/utils/checklist-score';
import { formatDateTime } from '@/utils/date';

import { AdminTableShell } from './admin-table-shell';
import {
  ResponsiveTable,
  TABLE_CLASS,
  TD_CLASS,
  TableHeaders,
} from './table-primitives';

interface ChecklistResponsesTableProps {
  responses: AdminChecklistResponseRow[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  returnTo: string;
  footer: ReactNode;
}

export function ChecklistResponsesTable({
  responses,
  total,
  page,
  totalPages,
  isLoading,
  returnTo,
  footer,
}: ChecklistResponsesTableProps) {
  return (
    <AdminTableShell
      accent
      summary={
        isLoading
          ? 'Cargando respuestas...'
          : `${responses.length.toLocaleString('en-US')} de ${total.toLocaleString('en-US')} respuestas · página ${page.toLocaleString('en-US')} de ${totalPages.toLocaleString('en-US')}`
      }>
      {responses.length === 0 && !isLoading ? (
        <EmptyState message="No hay respuestas para el filtro seleccionado." />
      ) : (
        <>
          <div className="max-[760px]:hidden">
            <ResponsiveTable>
              <table className={TABLE_CLASS}>
                <TableHeaders
                  headers={[
                    'Fecha',
                    'Inmueble',
                    'Activo',
                    'Frecuencia',
                    'Operatividad',
                    'Evidencia',
                    'Detalle',
                  ]}
                />
                <tbody>
                  {responses.map(response => (
                    <tr key={response.id}>
                      <td className={TD_CLASS}>
                        {formatDateTime(response.submitted_at)}
                      </td>
                      <td className={TD_CLASS}>
                        {response.building_name ?? '-'}
                      </td>
                      <td className={TD_CLASS}>
                        <strong className="block text-[0.95rem]">
                          {response.equipamento_nombre ?? '-'}
                        </strong>
                        <small className="mt-1 block text-slate-400">
                          {response.equipo_codigo ?? '-'}
                        </small>
                      </td>
                      <td className={TD_CLASS}>
                        <strong className="block">
                          {response.frequency ?? '-'}
                        </strong>
                        <small className="mt-1 block text-slate-500">
                          Período: {response.period_start ?? '-'}
                        </small>
                      </td>
                      <td className={TD_CLASS}>
                        <OperativityBadge response={response} />
                      </td>
                      <td className={TD_CLASS}>
                        <strong className="block text-sm text-slate-800">
                          {response.total_observed ?? 0} hallazgos
                        </strong>
                        <small className="mt-1 block text-slate-500">
                          {response.total_photos ?? 0} fotos adjuntas
                        </small>
                      </td>
                      <td className={TD_CLASS}>
                        <Link
                          className="inline-flex h-[34px] items-center rounded-[10px] bg-teal-100 px-3 text-[0.84rem] font-bold text-teal-950 no-underline hover:bg-teal-200"
                          href={`/admin/checklist/${response.id}?returnTo=${encodeURIComponent(returnTo)}`}>
                          Revisar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>
          <div className="grid gap-3 p-3 min-[761px]:hidden">
            {responses.map(response => (
              <ResponseCard
                key={response.id}
                response={response}
                returnTo={returnTo}
              />
            ))}
          </div>
        </>
      )}
      {footer}
    </AdminTableShell>
  );
}

function ResponseCard({
  response,
  returnTo,
}: {
  response: AdminChecklistResponseRow;
  returnTo: string;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {formatDateTime(response.submitted_at)}
          </p>
          <h3 className="m-0 mt-1 text-base font-black text-slate-950">
            {response.equipamento_nombre ?? 'Activo sin nombre'}
          </h3>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
            {response.building_name ?? '-'} · {response.equipo_codigo ?? '-'}
          </p>
        </div>
        <OperativityBadge response={response} />
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center text-xs">
        <span>
          <strong className="block text-slate-900">
            {response.frequency ?? '-'}
          </strong>
          Frecuencia
        </span>
        <span>
          <strong className="block text-slate-900">
            {response.total_observed ?? 0}
          </strong>
          Hallazgos
        </span>
        <span>
          <strong className="block text-slate-900">
            {response.total_photos ?? 0}
          </strong>
          Fotos
        </span>
      </div>
      <Link
        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-800 px-3 text-sm font-black text-white no-underline hover:bg-emerald-900"
        href={`/admin/checklist/${response.id}?returnTo=${encodeURIComponent(returnTo)}`}>
        Revisar auditoría
      </Link>
    </article>
  );
}

function OperativityBadge({
  response,
}: {
  response: AdminChecklistResponseRow;
}) {
  const score = getChecklistWeightedScore(response);

  if (response.estado_operatividad === 'stand_by') {
    return (
      <span className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600">
        Stand by
      </span>
    );
  }

  if (response.estado_operatividad === 'inoperativo') {
    return (
      <span className="mb-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-900">
        Inoperativo
      </span>
    );
  }

  if (score.percent === null) {
    return (
      <span className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600">
        Sin datos
      </span>
    );
  }

  const isLowScore = score.percent < 80;

  return (
    <span
      className={`mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
        isLowScore
          ? 'bg-orange-100 text-orange-900'
          : 'bg-emerald-100 text-emerald-900'
      }`}>
      {formatWeight(score.percent)}%
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center px-5 py-10 text-center text-slate-500">
      <div>
        <strong className="block text-lg text-[#0c1720]">Sin resultados</strong>
        <p className="mb-0 mt-2">{message}</p>
      </div>
    </div>
  );
}
