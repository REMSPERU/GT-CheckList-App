'use client';

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

export default function AdminMaintenancesPage() {
  const maintenances = useAdminMaintenances();

  const propertyOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...maintenances.properties.map(item => ({
      value: item.id,
      label: item.name,
    })),
  ];

  const equipmentTypeOptions = [
    { value: '', label: 'Todos los tipos de equipo' },
    ...maintenances.equipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}`,
    })),
  ];

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <section className="grid grid-cols-[1.5fr_1.2fr_1.2fr_1.1fr_1.1fr_1.2fr_0.8fr] gap-2.5 max-[1400px]:grid-cols-4 max-[1024px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
        <SearchInput
          placeholder="Buscar sesión, inmueble, equipos..."
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
          ariaLabel="Filtrar por tipo de equipo"
        />

        <div className="flex flex-col justify-center min-h-11">
          <input
            type="date"
            className="min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[0.95rem] text-slate-900 focus:border-blue-500 focus:outline-none"
            value={maintenances.startDate}
            onChange={e => maintenances.setStartDate(e.target.value)}
            aria-label="Fecha inicio"
            title="Fecha inicio programada"
          />
        </div>

        <div className="flex flex-col justify-center min-h-11">
          <input
            type="date"
            className="min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[0.95rem] text-slate-900 focus:border-blue-500 focus:outline-none"
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
          className="min-h-11 w-full px-3 py-2.5 rounded-[10px] border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[0.9rem] font-bold transition-all flex items-center justify-center gap-1.5"
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
