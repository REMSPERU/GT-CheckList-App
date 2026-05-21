'use client';

import { AdminPagination } from '@/components/admin/admin-pagination';
import { AuditSessionsTable } from '@/components/admin/audit-sessions-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import { useAdminAudits } from '@/hooks/admin/use-admin-audits';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'SINCRONIZADA', label: 'Sincronizada' },
  { value: 'ENVIADA', label: 'Enviada' },
  { value: 'EN_PROGRESO', label: 'En progreso' },
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

export default function AdminAuditoriasPage() {
  const audits = useAdminAudits();
  const propertyOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...audits.properties.map(property => ({
      value: property.id,
      label: property.name,
    })),
  ];

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <Alert>{audits.errorMessage}</Alert>

      <section className="grid gap-4">
        <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_minmax(180px,0.8fr)] gap-3 max-[980px]:grid-cols-1">
          <SearchInput
            placeholder="Buscar inmueble, auditor o estado"
            value={audits.search}
            onChange={audits.setSearch}
          />
          <SelectField
            value={audits.selectedPropertyId}
            options={propertyOptions}
            onChange={audits.setSelectedPropertyId}
            ariaLabel="Filtrar auditorias por inmueble"
          />
          <SelectField
            value={audits.selectedStatus}
            options={STATUS_OPTIONS}
            onChange={audits.setSelectedStatus}
            ariaLabel="Filtrar auditorias por estado"
          />
        </div>

        <AuditSessionsTable
          audits={audits.audits}
          total={audits.total}
          page={audits.page}
          totalPages={audits.totalPages}
          isLoading={audits.isLoading}
          footer={
            <AdminPagination
              page={audits.page}
              totalPages={audits.totalPages}
              isLoading={audits.isLoading}
              setPage={audits.setPage}
            />
          }
        />
      </section>
    </main>
  );
}
