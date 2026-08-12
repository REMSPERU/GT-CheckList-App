'use client';

import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { mapTipoLabel } from '@/lib/equipment-labels';
import type { AdminEquipmentTypeRow, AdminPropertyRow } from '@/types/admin';

interface Props {
  search: string;
  propertyId: string;
  systemId: string;
  equipmentTypeId: string;
  tipo: string;
  subtipo: string;
  properties: AdminPropertyRow[];
  systems: { id: string; nombre: string }[];
  equipmentTypes: AdminEquipmentTypeRow[];
  tipos: string[];
  subtipos: string[];
  onSearchChange: (value: string) => void;
  onPropertyChange: (value: string) => void;
  onSystemChange: (value: string) => void;
  onEquipmentTypeChange: (value: string) => void;
  onTipoChange: (value: string) => void;
  onSubtipoChange: (value: string) => void;
}

export function QrFilterBar({ search, propertyId, systemId, equipmentTypeId, tipo, subtipo, properties, systems, equipmentTypes, tipos, subtipos, onSearchChange, onPropertyChange, onSystemChange, onEquipmentTypeChange, onTipoChange, onSubtipoChange }: Props) {
  const propertyOptions = [{ value: '', label: 'Todos los inmuebles' }, ...properties.map(item => ({ value: item.id, label: item.name }))];
  const systemOptions = [{ value: '', label: 'Todas las especialidades' }, ...systems.map(item => ({ value: item.id, label: item.nombre }))];
  const availableTypes = systemId ? equipmentTypes.filter(item => item.systemId === systemId) : equipmentTypes;
  const typeOptions = [{ value: '', label: 'Todos los tipos de activo' }, ...availableTypes.map(item => ({ value: item.id, label: item.nombre }))];
  const tipoOptions = [{ value: '', label: 'Todos los tipos' }, ...tipos.map(value => ({ value, label: mapTipoLabel(value) }))];
  const subtipoOptions = [{ value: '', label: 'Todos los subtipos' }, ...subtipos.map(value => ({ value, label: mapTipoLabel(value) }))];

  return (
    <section className="qr-print-controls rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div><h2 className="m-0 text-sm font-bold text-slate-900">Filtrar activos</h2><p className="m-0 mt-0.5 hidden text-xs text-slate-500 sm:block">Define el alcance de impresión.</p></div>
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-emerald-800">Filtros</span>
      </div>
      <div className="grid grid-cols-5 gap-2 max-[1100px]:grid-cols-3 max-[700px]:grid-cols-2 max-[480px]:grid-cols-1">
        <SearchInput placeholder="Buscar código o ubicación" value={search} onChange={onSearchChange} />
        <SearchableSelect value={propertyId} options={propertyOptions} onChange={onPropertyChange} placeholder="Todos los inmuebles" />
        <SearchableSelect value={systemId} options={systemOptions} onChange={onSystemChange} placeholder="Todas las especialidades" />
        <SearchableSelect value={equipmentTypeId} options={typeOptions} onChange={onEquipmentTypeChange} placeholder="Todos los tipos de activo" />
        <SearchableSelect value={tipo} options={tipoOptions} onChange={onTipoChange} placeholder="Todos los tipos" />
        {tipo && <SearchableSelect value={subtipo} options={subtipoOptions} onChange={onSubtipoChange} placeholder="Todos los subtipos" />}
      </div>
    </section>
  );
}
