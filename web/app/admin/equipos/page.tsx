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

  const propertyOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...equipments.properties.map(item => ({
      value: item.id,
      label: item.name,
    })),
  ];

  const equipmentTypeOptions = [
    { value: '', label: 'Todos los tipos de equipo' },
    ...equipments.equipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}`,
    })),
  ];

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <AdminPageHeader
        eyebrow="Inventario"
        title="Equipos"
        description="Consulta y administra los equipos registrados por inmueble, tipo y estado."
      />
      <section className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
        <SearchInput
          placeholder="Buscar codigo o ubicacion"
          value={equipments.search}
          onChange={equipments.setSearch}
        />
        <SelectField
          value={equipments.propertyId}
          options={propertyOptions}
          onChange={equipments.handlePropertyChange}
          ariaLabel="Filtrar por inmueble"
        />
        <SelectField
          value={equipments.equipmentTypeId}
          options={equipmentTypeOptions}
          onChange={equipments.handleEquipmentTypeChange}
          ariaLabel="Filtrar por tipo de equipo"
        />
        <SelectField
          value={equipments.status}
          options={STATUS_OPTIONS}
          onChange={equipments.handleStatusChange}
          ariaLabel="Filtrar por estado"
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
