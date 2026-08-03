'use client';

import type { ReactNode } from 'react';
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

export function EquipmentTable({
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
          : `${items.length.toLocaleString('en-US')} de ${total.toLocaleString('en-US')} activos · pagina ${page.toLocaleString('en-US')} de ${totalPages.toLocaleString('en-US')}`
      }>
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
            {items.map(item => (
              <tr
                className="transition-colors hover:bg-secondary/60"
                key={item.id}>
                <td className={TD_CLASS}>{item.codigo ?? '-'}</td>
                <td className={TD_CLASS}>
                  <strong className="block text-text-main">{item.propertyName}</strong>
                  <small className="mt-1 block text-text-muted">
                    {item.propertyCity ?? item.propertyCode ?? '-'}
                  </small>
                </td>
                <td className={TD_CLASS}>{item.equipmentName}</td>
                <td className={TD_CLASS}>
                  <strong className="block text-text-main">
                    {formatUbicacion(item.ubicacion)}
                  </strong>
                  <small className="mt-1 block text-text-muted">
                    {item.detalle_ubicacion ?? ''}
                  </small>
                </td>
                <td className={TD_CLASS}>
                  <StatusBadge
                    variant={
                      item.estatus === 'OPERATIVO' || item.estatus === 'ACTIVO'
                        ? 'success'
                        : item.estatus === 'EN_REVISACION' || item.estatus === 'PENDIENTE'
                          ? 'warning'
                          : 'neutral'
                    }>
                    {item.estatus}
                  </StatusBadge>
                </td>
                <td className={TD_CLASS}>{item.config ? 'Si' : 'No'}</td>
                <td className={TD_CLASS}>
                  <Link
                    className="inline-flex rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground no-underline shadow-sm transition-colors hover:bg-primary-hover"
                    href={`/admin/equipos/${item.id}${backParam}`}>
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
      {footer}
    </AdminTableShell>
  );
}

