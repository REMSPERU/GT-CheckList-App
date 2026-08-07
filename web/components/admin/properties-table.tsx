import type { AdminPropertyRow } from '@/types/admin';

import { AdminTableShell } from './admin-table-shell';
import { ResponsiveTable, TABLE_CLASS, TD_CLASS, TableHeaders } from './table-primitives';

interface PropertiesTableProps {
  items: AdminPropertyRow[];
  isLoading: boolean;
}

export function PropertiesTable({ items, isLoading }: PropertiesTableProps) {
  return (
    <AdminTableShell
      summary={isLoading ? 'Cargando inmuebles...' : `${items.length} inmuebles`}>
      <ResponsiveTable>
        <table className={TABLE_CLASS}>
          <TableHeaders
            headers={['Codigo', 'Nombre', 'Ciudad', 'Direccion']}
          />
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="border-b border-slate-100 px-[18px] py-10 text-center text-sm text-slate-400">
                  No se encontraron inmuebles registrados.
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.id}>
                  {[
                    item.code ?? '-',
                    item.name,
                    item.city ?? '-',
                    item.address ?? '-',
                  ].map((value, index) => (
                    <td className={TD_CLASS} key={`${item.id}-${index}`}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTable>
    </AdminTableShell>
  );
}
