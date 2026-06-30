'use client';

import { Suspense } from 'react';
import Link from 'next/link';
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

function AdminEquipmentsContent() {
  const equipments = useAdminEquipments();

  const propertyOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...equipments.properties.map(item => ({
      value: item.id,
      label: item.name,
    })),
  ];

  const systemOptions = [
    { value: '', label: 'Todas las especialidades' },
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
    { value: '', label: 'Todos los tipos de activo' },
    ...filteredEquipmentTypes.map(item => ({
      value: item.id,
      label: item.nombre,
    })),
  ];

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-900/10 bg-white/80 px-4 py-3 shadow-sm">
        <div>
          <h1 className="m-0 text-xl font-black tracking-[-0.04em] text-[#0c1720]">
            Activos
          </h1>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
            Consulta activos y genera etiquetas QR imprimibles.
          </p>
        </div>
        <Link
          className="rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-black text-white no-underline shadow-sm transition-colors hover:bg-[#0c1720]"
          href="/admin/equipos/qr">
          Imprimir QRs
        </Link>
      </section>
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
          ariaLabel="Filtrar por especialidad"
        />
        <SearchableSelect
          value={equipments.equipmentTypeId}
          options={equipmentTypeOptions}
          onChange={equipments.handleEquipmentTypeChange}
          placeholder="Todos los tipos de activo"
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

export default function AdminEquipmentsPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-[400px] place-items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
        <p className="text-sm text-slate-500 font-medium">Cargando activos...</p>
      </div>
    }>
      <AdminEquipmentsContent />
    </Suspense>
  );
}
