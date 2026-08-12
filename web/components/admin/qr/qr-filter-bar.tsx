'use client';

import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SelectField } from '@/components/ui/select-field';
import { mapTipoLabel } from '@/lib/equipment-labels';
import type { AdminEquipmentTypeRow, AdminPropertyRow } from '@/types/admin';

const STATUS_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

interface Props {
  search: string;
  status: string;
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
  onStatusChange: (value: string) => void;
  onPropertyChange: (value: string) => void;
  onSystemChange: (value: string) => void;
  onEquipmentTypeChange: (value: string) => void;
  onTipoChange: (value: string) => void;
  onSubtipoChange: (value: string) => void;
}

export function QrFilterBar({ search, status, propertyId, systemId, equipmentTypeId, tipo, subtipo, properties, systems, equipmentTypes, tipos, subtipos, onSearchChange, onStatusChange, onPropertyChange, onSystemChange, onEquipmentTypeChange, onTipoChange, onSubtipoChange }: Props) {
  const propertyOptions = [{ value: '', label: 'Todos los inmuebles' }, ...properties.map(item => ({ value: item.id, label: item.name }))];
  const systemOptions = [{ value: '', label: 'Todas las especialidades' }, ...systems.map(item => ({ value: item.id, label: item.nombre }))];
  const availableTypes = systemId ? equipmentTypes.filter(item => item.systemId === systemId) : equipmentTypes;
  const typeOptions = [{ value: '', label: 'Todos los tipos de activo' }, ...availableTypes.map(item => ({ value: item.id, label: item.nombre }))];
  const tipoOptions = [{ value: '', label: 'Todos los tipos' }, ...tipos.map(value => ({ value, label: mapTipoLabel(value) }))];
  const subtipoOptions = [{ value: '', label: 'Todos los subtipos' }, ...subtipos.map(value => ({ value, label: mapTipoLabel(value) }))];

  return (
    <section className="qr-print-controls rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="m-0 text-sm font-bold text-slate-900">Alcance de impresión</h2><p className="m-0 mt-1 text-xs text-slate-500">Selecciona los activos que llevarán etiqueta.</p></div>
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-emerald-800">Filtros</span>
      </div>
      <div className="grid grid-cols-[1.3fr_1.1fr_1fr_1.1fr] gap-2.5 max-[1100px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
        <SearchInput placeholder="Buscar código o ubicación" value={search} onChange={onSearchChange} />
        <SearchableSelect value={propertyId} options={propertyOptions} onChange={onPropertyChange} placeholder="Todos los inmuebles" />
        <SelectField value={systemId} options={systemOptions} onChange={onSystemChange} ariaLabel="Filtrar por especialidad" />
        <SelectField value={equipmentTypeId} options={typeOptions} onChange={onEquipmentTypeChange} ariaLabel="Filtrar por tipo de activo" />
        <SearchableSelect value={tipo} options={tipoOptions} onChange={onTipoChange} placeholder="Todos los tipos" />
        {tipo && <SearchableSelect value={subtipo} options={subtipoOptions} onChange={onSubtipoChange} placeholder="Todos los subtipos" />}
        <SelectField value={status} options={STATUS_OPTIONS} onChange={onStatusChange} ariaLabel="Filtrar por estado" />
      </div>
    </section>
  );
}
