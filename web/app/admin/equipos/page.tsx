'use client';

import { AdminPagination } from '@/components/admin/admin-pagination';
import { EquipmentTable } from '@/components/admin/equipment-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import { SearchableSelect } from '@/components/ui/searchable-select';
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

  const systemOptions = [
    { value: '', label: 'Todos los sistemas' },
    ...equipments.systems.map(item => ({
      value: item.id,
      label: item.nombre,
    })),
  ];

  // Dynamically filter equipment types if a system is selected
  let filteredEquipmentTypes = equipments.systemId
    ? equipments.equipmentTypes.filter(item => item.systemId === equipments.systemId)
    : equipments.equipmentTypes;

  // Dynamically filter equipment types to only those present in the selected property
  const availableIds = equipments.availableEquipmentTypeIds;
  if (availableIds) {
    filteredEquipmentTypes = filteredEquipmentTypes.filter(item =>
      availableIds.includes(item.id),
    );
  }

  const equipmentTypeOptions = [
    { value: '', label: 'Todos los tipos de equipo' },
    ...filteredEquipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}`,
    })),
  ];

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <section className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr_0.8fr] gap-2.5 max-[1200px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
        <SearchInput
          placeholder="Buscar codigo o ubicacion"
          value={equipments.search}
          onChange={equipments.setSearch}
        />
        <SearchableSelect
          value={equipments.propertyId}
          options={propertyOptions}
          onChange={equipments.handlePropertyChange}
          placeholder="Todos los inmuebles"
        />
        <SelectField
          value={equipments.systemId}
          options={systemOptions}
          onChange={equipments.handleSystemChange}
          ariaLabel="Filtrar por sistema"
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
