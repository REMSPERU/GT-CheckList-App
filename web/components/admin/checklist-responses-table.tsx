import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { AdminChecklistResponseRow } from '@/types/admin';
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
  expandedResponseId: string | null;
  setExpandedResponseId: Dispatch<SetStateAction<string | null>>;
  isLoading: boolean;
  footer: ReactNode;
}

export function ChecklistResponsesTable({
  responses,
  total,
  page,
  totalPages,
  expandedResponseId,
  setExpandedResponseId,
  isLoading,
  footer,
}: ChecklistResponsesTableProps) {
  return (
    <AdminTableShell
      accent
      summary={
        isLoading
          ? 'Cargando respuestas...'
          : `${responses.length} de ${total} respuestas · página ${page} de ${totalPages}`
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
                'Equipo',
                'Frecuencia',
                'Resumen',
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
                    <strong className="block">
                      {response.equipo_codigo ?? '-'}
                    </strong>
                    <small className="mt-1 block text-slate-500">
                      {response.equipamento_nombre ?? '-'}
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
                    <StatusBadge
                      observed={response.total_observed ?? 0}
                      ok={response.total_ok ?? 0}
                      total={response.total_questions ?? 0}
                    />
                    <small className="mt-2 block text-slate-500">
                      Observadas {response.total_observed ?? 0} · Fotos{' '}
                      {response.total_photos ?? 0}
                    </small>
                  </td>
                  <td className={TD_CLASS}>
                    <button
                      className="m-0 h-[34px] w-auto rounded-[10px] bg-teal-100 px-3 text-[0.84rem] font-bold text-teal-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      onClick={() =>
                        setExpandedResponseId(current =>
                          current === response.id ? null : response.id,
                        )
                      }
                      aria-expanded={expandedResponseId === response.id}>
                      {expandedResponseId === response.id ? 'Ocultar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}

      {responses.map(response =>
        expandedResponseId === response.id ? (
          <div
            className="border-t border-slate-300 bg-[#fbfdfb] p-[18px]"
            key={`detail-${response.id}`}>
            <h3 className="mb-3 mt-0 text-lg font-bold">
              Detalle de respuestas
            </h3>
            {response.answers.length === 0 ? (
              <p>No hay detalle JSON de respuestas para este registro.</p>
            ) : (
              <div className="grid gap-2.5">
                {response.answers.map(answer => (
                  <article
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 gap-y-2.5 rounded-2xl border border-[#dfe8e5] bg-white p-3.5 max-[640px]:grid-cols-1"
                    key={`${response.id}-${answer.pregunta_id}`}>
                    <div>
                      <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                        Pregunta {answer.orden ?? '-'}
                      </span>
                      <h4 className="m-0 text-[#0c1720]">{answer.pregunta}</h4>
                    </div>
                    <span
                      className={
                        answer.status_ok
                          ? 'inline-flex min-h-7 items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-900'
                          : 'inline-flex min-h-7 items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-orange-900'
                      }>
                      {answer.status_ok ? 'Conforme' : 'Observada'}
                    </span>
                    {answer.observacion ? (
                      <p className="col-span-full m-0 text-slate-500">
                        {answer.observacion}
                      </p>
                    ) : null}
                    <small className="col-span-full m-0 text-slate-500">
                      {answer.fotos.length > 0
                        ? `${answer.fotos.length} fotos de evidencia`
                        : 'Sin fotos de evidencia'}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null,
      )}

      {footer}
    </AdminTableShell>
  );
}

interface StatusBadgeProps {
  observed: number;
  ok: number;
  total: number;
}

function StatusBadge({ observed, ok, total }: StatusBadgeProps) {
  const hasObservations = observed > 0;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
        hasObservations
          ? 'bg-orange-100 text-orange-900'
          : 'bg-green-100 text-green-900'
      }`}>
      {hasObservations ? `${observed} observadas` : 'Conforme'} · OK {ok} /{' '}
      {total}
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
