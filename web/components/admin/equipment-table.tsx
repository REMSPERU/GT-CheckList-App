import type { ReactNode } from 'react';

import type { AdminEquipmentRow } from '@/types/admin';

import { AdminTableShell } from './admin-table-shell';
import { StatusBadge } from './status-badge';
import { ResponsiveTable, TABLE_CLASS, TD_CLASS, TableHeaders } from './table-primitives';

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
  return (
    <AdminTableShell
      summary={
        isLoading
          ? 'Cargando equipos...'
          : `${items.length} de ${total} equipos · pagina ${page} de ${totalPages}`
      }>
      <ResponsiveTable>
        <table className={TABLE_CLASS}>
          <TableHeaders
            headers={['Codigo', 'Inmueble', 'Tipo', 'Ubicacion', 'Estado', 'Config']}
          />
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className={TD_CLASS}>{item.codigo ?? '-'}</td>
                <td className={TD_CLASS}>
                  <strong className="block">{item.propertyName}</strong>
                  <small className="mt-1 block text-slate-500">
                    {item.propertyCity ?? item.propertyCode ?? '-'}
                  </small>
                </td>
                <td className={TD_CLASS}>{item.equipmentName}</td>
                <td className={TD_CLASS}>
                  <strong className="block">{item.ubicacion ?? '-'}</strong>
                  <small className="mt-1 block text-slate-500">
                    {item.detalle_ubicacion ?? ''}
                  </small>
                </td>
                <td className={TD_CLASS}>
                  <StatusBadge>{item.estatus}</StatusBadge>
                </td>
                <td className={TD_CLASS}>{item.config ? 'Si' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
      {footer}
    </AdminTableShell>
  );
}
