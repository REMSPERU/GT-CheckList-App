'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import type { AdminEquipmentRow } from '@/types/admin';
import { formatUbicacion } from '@/lib/ubicacion';

import { AdminTableShell } from './admin-table-shell';
import { StatusBadge } from './status-badge';
import {
  ResponsiveTable,
  TABLE_CLASS,
  TD_CLASS,
  TableHeaders,
} from './table-primitives';

interface EquipmentTableProps {
  items: AdminEquipmentRow[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  footer: ReactNode;
}

export const EquipmentTable = memo(function EquipmentTable({
  items,
  total,
  page,
  totalPages,
  isLoading,
  footer,
}: EquipmentTableProps) {
  const searchParams = useSearchParams();
  const backQuery = searchParams.toString();
  const backParam = backQuery ? `?back=${encodeURIComponent(backQuery)}` : '';
  return (
    <AdminTableShell
      summary={
        isLoading
          ? 'Cargando activos...'
          : `${items.length.toLocaleString('es-PE')} de ${total.toLocaleString('es-PE')} activos · página ${page.toLocaleString('es-PE')} de ${totalPages.toLocaleString('es-PE')}`
      }>
      <div className="[contain:content]">
        <ResponsiveTable>
          <table className={TABLE_CLASS}>
            <TableHeaders
              headers={[
                'Codigo',
                'Inmueble',
                'Tipo',
                'Ubicacion',
                'Estado',
                'Config',
                'Detalle',
              ]}
            />
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border-b border-slate-100 px-[18px] py-10 text-center text-sm text-slate-400">
                    No se encontraron activos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr
                    className="transition-colors hover:bg-slate-50"
                    key={item.id}>
                    <td className={TD_CLASS}>{item.codigo ?? '-'}</td>
                    <td className={TD_CLASS}>
                      <strong className="block font-semibold">{item.propertyName}</strong>
                      <small className="mt-0.5 block text-slate-500 text-[11px]">
                        {item.propertyCity ?? item.propertyCode ?? '-'}
                      </small>
                    </td>
                    <td className={TD_CLASS}>{item.equipmentName}</td>
                    <td className={TD_CLASS}>
                      <strong className="block font-medium">
                        {formatUbicacion(item.ubicacion)}
                      </strong>
                      <small className="mt-0.5 block text-slate-500 text-[11px]">
                        {item.detalle_ubicacion ?? ''}
                      </small>
                    </td>
                    <td className={TD_CLASS}>
                      <StatusBadge>{item.estatus}</StatusBadge>
                    </td>
                    <td className={TD_CLASS}>{item.config ? 'Sí' : 'No'}</td>
                    <td className={TD_CLASS}>
                      <Link
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 no-underline shadow-xs transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px]"
                        href={`/admin/equipos/${item.id}${backParam}`}
                        aria-label={`Ver detalle del activo ${item.codigo ?? item.equipmentName}`}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
      {footer}
    </AdminTableShell>
  );
});

