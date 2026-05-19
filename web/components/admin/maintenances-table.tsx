import type { AdminMaintenanceRow } from '@/types/admin';
import { formatDate } from '@/utils/date';

import { AdminTableShell } from './admin-table-shell';
import { StatusBadge } from './status-badge';
import { ResponsiveTable, TABLE_CLASS, TD_CLASS, TableHeaders } from './table-primitives';

interface MaintenancesTableProps {
  items: AdminMaintenanceRow[];
  isLoading: boolean;
}

export function MaintenancesTable({ items, isLoading }: MaintenancesTableProps) {
  return (
    <AdminTableShell
      summary={
        isLoading ? 'Cargando mantenimientos...' : `${items.length} mantenimientos`
      }>
      <ResponsiveTable>
        <table className={TABLE_CLASS}>
          <TableHeaders
            headers={['Codigo', 'Inmueble', 'Equipo', 'Fecha', 'Tipo', 'Estado']}
          />
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className={TD_CLASS}>{item.codigo ?? '-'}</td>
                <td className={TD_CLASS}>{item.propertyName}</td>
                <td className={TD_CLASS}>
                  <strong className="block">{item.equipmentCode ?? '-'}</strong>
                  <small className="mt-1 block text-slate-500">
                    {item.equipmentType}
                  </small>
                </td>
                <td className={TD_CLASS}>{formatDate(item.dia_programado)}</td>
                <td className={TD_CLASS}>{item.tipo_mantenimiento ?? '-'}</td>
                <td className={TD_CLASS}>
                  <StatusBadge>{item.estatus}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
    </AdminTableShell>
  );
}
