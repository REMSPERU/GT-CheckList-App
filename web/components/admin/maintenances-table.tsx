import type { AdminMaintenanceSessionRow } from '@/types/admin';
import { formatDate } from '@/utils/date';

import { AdminTableShell } from './admin-table-shell';
import { StatusBadge } from './status-badge';
import { ResponsiveTable, TABLE_CLASS, TD_CLASS, TableHeaders } from './table-primitives';

interface MaintenancesTableProps {
  items: AdminMaintenanceSessionRow[];
  isLoading: boolean;
}

export function MaintenancesTable({ items, isLoading }: MaintenancesTableProps) {
  return (
    <AdminTableShell
      summary={
        isLoading ? 'Cargando sesiones...' : `${items.length} sesiones de mantenimiento`
      }>
      <ResponsiveTable>
        <table className={TABLE_CLASS}>
          <TableHeaders
            headers={['Sesión / Visita', 'Inmueble', 'Equipos Cubiertos', 'Fecha Programada', 'Progreso', 'Estado']}
          />
          <tbody>
            {items.map(item => {
              const percent = item.maintenancesCount > 0 
                ? Math.round((item.completedCount / item.maintenancesCount) * 100)
                : 0;

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className={TD_CLASS}>
                    <strong className="block text-slate-800 text-[0.95rem]">
                      {item.nombre || 'Sesión de Mantenimiento'}
                    </strong>
                    {item.descripcion && (
                      <span className="mt-1 block text-xs text-slate-500 max-w-[250px] truncate">
                        {item.descripcion}
                      </span>
                    )}
                  </td>
                  <td className={TD_CLASS}>
                    <span className="block text-slate-700 font-semibold">{item.propertyName}</span>
                    {item.propertyCode && (
                      <span className="text-xs text-slate-400 block mt-0.5">{item.propertyCode}</span>
                    )}
                  </td>
                  <td className={TD_CLASS}>
                    <strong className="block text-slate-700 text-xs truncate max-w-[200px]" title={item.equipmentCodes.join(', ')}>
                      {item.equipmentCodes.length > 0 
                        ? item.equipmentCodes.join(', ')
                        : 'Sin equipos'}
                    </strong>
                    {item.equipmentTypes.length > 0 && (
                      <span className="mt-1 block text-[11px] text-slate-500 font-medium truncate max-w-[200px]" title={item.equipmentTypes.join(', ')}>
                        {item.equipmentTypes.join(', ')}
                      </span>
                    )}
                  </td>
                  <td className={TD_CLASS}>
                    <span className="text-slate-600 font-medium text-[0.9rem]">
                      {formatDate(item.fecha_programada)}
                    </span>
                  </td>
                  <td className={TD_CLASS}>
                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                      <span className="text-xs text-slate-600 font-bold">
                        {item.completedCount} / {item.maintenancesCount} terminados
                      </span>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={TD_CLASS}>
                    <StatusBadge>{item.estatus}</StatusBadge>
                  </td>
                </tr>
              );
            })}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No se encontraron sesiones de mantenimiento con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveTable>
    </AdminTableShell>
  );
}
