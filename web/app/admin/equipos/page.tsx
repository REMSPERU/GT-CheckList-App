'use client';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { EquipmentTable } from '@/components/admin/equipment-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import { useAdminEquipments } from '@/hooks/admin/use-admin-equipments';

const STATUS_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

export default function AdminEquipmentsPage() {
  const equipments = useAdminEquipments();

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <AdminPageHeader
        eyebrow="Inventario"
        title="Equipos"
        description="Consulta todos los equipos con paginacion y filtro por estado."
      />
      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <SearchInput
          placeholder="Buscar codigo o ubicacion"
          value={equipments.search}
          onChange={equipments.setSearch}
        />
        <SelectField
          value={equipments.status}
          options={STATUS_OPTIONS}
          onChange={equipments.handleStatusChange}
        />
      </section>
      <Alert>{equipments.errorMessage}</Alert>
      <EquipmentTable
        items={equipments.items}
        total={equipments.total}
        page={equipments.page}
        totalPages={equipments.totalPages}
        isLoading={equipments.isLoading}
        footer={
          <AdminPagination
            page={equipments.page}
            totalPages={equipments.totalPages}
            isLoading={equipments.isLoading}
            setPage={equipments.setPage}
          />
        }
      />
    </main>
  );
}
