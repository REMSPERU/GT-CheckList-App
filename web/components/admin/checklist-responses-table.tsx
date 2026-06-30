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
        <ResponsiveTable>
          <table className={TABLE_CLASS}>
            <TableHeaders
              headers={[
                'Fecha',
                'Inmueble',
                'Activo',
                'Frecuencia',
                'Operatividad',
                'Detalle',
              ]}
            />
            <tbody>
              {responses.map(response => (
                <tr key={response.id}>
                  <td className={TD_CLASS}>
                    {formatDateTime(response.submitted_at)}
                  </td>
                  <td className={TD_CLASS}>{response.building_name ?? '-'}</td>
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
                      {response.period_start ?? ''}
                    </small>
                  </td>
                  <td className={TD_CLASS}>
                    <OperativityBadge response={response} />
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
      )}
      {footer}
    </AdminTableShell>
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
