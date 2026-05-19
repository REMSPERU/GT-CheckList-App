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

  const systemOptions = [
    { value: '', label: 'Todos los sistemas' },
    ...equipments.systems.map(item => ({
      value: item.id,
      label: item.nombre,
    })),
  ];

  // Dynamically filter equipment types if a system is selected
  const filteredEquipmentTypes = equipments.systemId
    ? equipments.equipmentTypes.filter(item => item.systemId === equipments.systemId)
    : equipments.equipmentTypes;

  const equipmentTypeOptions = [
    { value: '', label: 'Todos los tipos de equipo' },
    ...filteredEquipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}`,
    })),
  ];

  return (
    <main className="grid gap-4 px-8 pb-8 pt-5 max-[640px]:px-[14px]">
      <AdminPageHeader
        eyebrow="Inventario"
        title="Equipos"
        description="Consulta y administra los equipos registrados por inmueble, sistema, tipo y estado."
        compact
      />
      <section className="grid grid-cols-[1.2fr_1fr_1fr_1.2fr_0.8fr] gap-2.5 max-[1200px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
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
