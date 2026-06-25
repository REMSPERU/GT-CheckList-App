import type { ReactNode } from 'react';
import Link from 'next/link';

import type { AdminAuditSessionRow } from '@/types/admin';
import { formatDate, formatDateTime } from '@/utils/date';

import { AdminTableShell } from './admin-table-shell';
import {
  ResponsiveTable,
  TABLE_CLASS,
  TD_CLASS,
  TableHeaders,
} from './table-primitives';

interface AuditSessionsTableProps {
  audits: AdminAuditSessionRow[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  footer: ReactNode;
}

export function AuditSessionsTable({
  audits,
  total,
  page,
  totalPages,
  isLoading,
  footer,
}: AuditSessionsTableProps) {
  return (
    <AdminTableShell
      accent
      summary={
        isLoading
          ? 'Cargando auditorias...'
          : `${audits.length.toLocaleString('en-US')} de ${total.toLocaleString('en-US')} auditorias · página ${page.toLocaleString('en-US')} de ${totalPages.toLocaleString('en-US')}`
      }>
      {audits.length === 0 && !isLoading ? (
        <EmptyState />
      ) : (
        <ResponsiveTable>
          <table className={TABLE_CLASS}>
            <TableHeaders
              headers={[
                'Fecha',
                'Inmueble',
                'Auditor',
                'Estado',
                'Resumen',
                'Detalle',
              ]}
            />
            <tbody>
              {audits.map(audit => (
                <tr key={audit.id}>
                  <td className={TD_CLASS}>
                    <strong className="block">
                      {formatDateTime(audit.submitted_at ?? audit.created_at)}
                    </strong>
                    <small className="mt-1 block text-slate-500">
                      Prog. {formatDate(audit.scheduled_for)}
                    </small>
                  </td>
                  <td className={TD_CLASS}>
                    <strong className="block">{audit.propertyName}</strong>
                    <small className="mt-1 block text-slate-500">
                      {audit.propertyCode ?? audit.property_id}
                    </small>
                  </td>
                  <td className={TD_CLASS}>{audit.auditorName}</td>
                  <td className={TD_CLASS}>
                    <StatusBadge status={audit.status} />
                  </td>
                  <td className={TD_CLASS}>
                    <strong className="block text-amber-700">
                      {audit.total_obs.toLocaleString('en-US')} observadas
                    </strong>
                    <small className="mt-1 block text-slate-500">
                      {audit.total_ok.toLocaleString('en-US')} OK · {audit.total_photos.toLocaleString('en-US')} fotos ·{' '}
                      {audit.total_applies.toLocaleString('en-US')} aplica
                    </small>
                  </td>
                  <td className={TD_CLASS}>
                    <Link
                      className="inline-flex h-[34px] items-center rounded-[10px] bg-teal-100 px-3 text-[0.84rem] font-bold text-teal-950 no-underline hover:bg-teal-200"
                      href={`/admin/auditorias/${audit.id}`}>
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

function StatusBadge({ status }: { status: string }) {
  const isSynced = status === 'SINCRONIZADA' || status === 'ENVIADA';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
        isSynced
          ? 'bg-emerald-100 text-emerald-900'
          : 'bg-slate-100 text-slate-700'
      }`}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[180px] place-items-center px-5 py-10 text-center text-slate-500">
      <div>
        <strong className="block text-lg text-[#0c1720]">Sin auditorias</strong>
        <p className="mb-0 mt-2">
          No hay auditorias sincronizadas para el filtro seleccionado.
        </p>
      </div>
    </div>
  );
}
