'use client';

import { Suspense } from 'react';
import { MaintenancesTable } from '@/components/admin/maintenances-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
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

function AdminMaintenancesContent() {
  const maintenances = useAdminMaintenances();

  const propertyOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...maintenances.properties.map(item => ({
      value: item.id,
      label: item.name,
    })),
  ];

  const equipmentTypeOptions = [
    { value: '', label: 'Todos los tipos de activo' },
    ...maintenances.equipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}`,
    })),
  ];

  return (
    <main className="grid gap-5 px-6 lg:px-8 py-6">
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 items-center gap-3">
        <SearchInput
          placeholder="Buscar sesión, inmueble, activos..."
          value={maintenances.search}
          onChange={maintenances.setSearch}
        />
        
        <SearchableSelect
          value={maintenances.propertyId}
          options={propertyOptions}
          onChange={maintenances.setPropertyId}
          placeholder="Todos los inmuebles"
        />

        <SelectField
          value={maintenances.equipmentTypeId}
          options={equipmentTypeOptions}
          onChange={maintenances.setEquipmentTypeId}
          ariaLabel="Filtrar por tipo de activo"
        />

        <div className="flex flex-col justify-center min-h-11">
          <input
            type="date"
            className="min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[0.95rem] text-slate-900 focus:border-[#07352f] focus:ring-1 focus:ring-emerald-800/20 focus:outline-none"
            value={maintenances.startDate}
            onChange={e => maintenances.setStartDate(e.target.value)}
            aria-label="Fecha inicio"
            title="Fecha inicio programada"
          />
        </div>

        <div className="flex flex-col justify-center min-h-11">
          <input
            type="date"
            className="min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[0.95rem] text-slate-900 focus:border-[#07352f] focus:ring-1 focus:ring-emerald-800/20 focus:outline-none"
            value={maintenances.endDate}
            onChange={e => maintenances.setEndDate(e.target.value)}
            aria-label="Fecha fin"
            title="Fecha fin programada"
          />
        </div>

        <SelectField
          value={maintenances.status}
          options={STATUS_OPTIONS}
          onChange={maintenances.setStatus}
          ariaLabel="Filtrar por estado"
        />

        <button
          onClick={maintenances.clearFilters}
          className="min-h-11 w-full px-3 py-2.5 rounded-[10px] border border-emerald-900/10 bg-[#edf5f3] hover:bg-[#e1ece9] text-[#0c1720] text-[0.9rem] font-bold transition-all flex items-center justify-center gap-1.5"
          title="Limpiar todos los filtros"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Limpiar</span>
        </button>
      </section>

      <Alert>{maintenances.errorMessage}</Alert>

      <MaintenancesTable
        items={maintenances.filteredItems}
        isLoading={maintenances.isLoading}
      />
    </main>
  );
}

export default function AdminMaintenancesPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-[400px] place-items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
        <p className="text-sm text-slate-500 font-medium">Cargando mantenimientos...</p>
      </div>
    }>
      <AdminMaintenancesContent />
    </Suspense>
  );
}
