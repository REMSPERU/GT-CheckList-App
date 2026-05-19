'use client';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { MaintenancesTable } from '@/components/admin/maintenances-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import { useAdminMaintenances } from '@/hooks/admin/use-admin-maintenances';

const STATUS_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'NO_INICIADO', label: 'No iniciado' },
  { value: 'EN_PROGRESO', label: 'En progreso' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export default function AdminMaintenancesPage() {
  const maintenances = useAdminMaintenances();

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <AdminPageHeader
        eyebrow="Operacion"
        title="Mantenimientos"
        description="Revision administrativa de mantenimientos programados y cerrados."
      />
      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <SearchInput
          placeholder="Buscar codigo, inmueble, equipo o tipo"
          value={maintenances.search}
          onChange={maintenances.setSearch}
        />
        <SelectField
          value={maintenances.status}
          options={STATUS_OPTIONS}
          onChange={maintenances.setStatus}
        />
      </section>
      <Alert>{maintenances.errorMessage}</Alert>
      <MaintenancesTable
        items={maintenances.filteredItems}
        isLoading={maintenances.isLoading}
      />
    </main>
  );
}
