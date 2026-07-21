'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { EquipmentTable } from '@/components/admin/equipment-table';
import { Alert } from '@/components/ui/alert';
import { SelectField } from '@/components/ui/select-field';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SearchInput } from '@/components/ui/search-input';
import { useAdminEquipments } from '@/hooks/admin/use-admin-equipments';

export function mapTipoLabel(tipo: string): string {
  const upper = tipo.toUpperCase().trim();
  if (upper === 'AIRE') return 'Extracción de Aire';
  if (upper === 'INYECCION') return 'Inyección de Aire';
  if (upper === 'MONOXIDO') return 'Extracción de Monóxido';
  if (upper === 'JET FAN') return 'Jet Fan';
  if (upper === 'PRESURIZADOR') return 'Presurizador de Escaleras';
  return tipo;
}

const STATUS_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

function AdminEquipmentsContent() {
  const equipments = useAdminEquipments();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPropertyPickerOpen, setIsPropertyPickerOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const propertyPickerRef = useRef<HTMLDivElement>(null);
  const [selectedBrandOption, setSelectedBrandOption] = useState<string>('');
  const [customBrandText, setCustomBrandText] = useState<string>('');

  useEffect(() => {
    const currentMarca = equipments.marca;
    if (!currentMarca) {
      if (selectedBrandOption === 'OTRO' && customBrandText === '') {
        return;
      }
      setSelectedBrandOption('');
      setCustomBrandText('');
      return;
    }

    const brandExists = equipments.brands.some(
      b => b.nombre.toLowerCase() === currentMarca.toLowerCase(),
    );

    if (brandExists) {
      const match = equipments.brands.find(
        b => b.nombre.toLowerCase() === currentMarca.toLowerCase(),
      );
      setSelectedBrandOption(match?.nombre || currentMarca);
      setCustomBrandText('');
    } else {
      setSelectedBrandOption('OTRO');
      setCustomBrandText(currentMarca);
    }
  }, [
    equipments.marca,
    equipments.brands,
    selectedBrandOption,
    customBrandText,
  ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        propertyPickerRef.current &&
        !propertyPickerRef.current.contains(event.target as Node)
      ) {
        setIsPropertyPickerOpen(false);
        setPropertySearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderMarcaField = () => {
    const brandOptions = [
      { value: '', label: 'Todas las marcas' },
      ...equipments.brands.map(b => ({ value: b.nombre, label: b.nombre })),
      { value: 'OTRO', label: 'Otros' },
    ];

    const handleBrandSelectChange = (val: string) => {
      if (val === 'OTRO') {
        setSelectedBrandOption('OTRO');
        setCustomBrandText('');
        equipments.handleMarcaChange('');
      } else {
        setSelectedBrandOption(val);
        setCustomBrandText('');
        equipments.handleMarcaChange(val);
      }
    };

    return (
      <div className="grid gap-1.5">
        <label className="text-xs font-bold text-slate-500">Marca</label>
        <SearchableSelect
          value={selectedBrandOption}
          options={brandOptions}
          onChange={handleBrandSelectChange}
          placeholder="Seleccionar marca..."
        />
        {selectedBrandOption === 'OTRO' && (
          <input
            type="text"
            value={customBrandText}
            onChange={e => {
              const val = e.target.value;
              setCustomBrandText(val);
              equipments.handleMarcaChange(val);
            }}
            placeholder="Escriba la marca..."
            className="min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900 outline-none focus:border-[#07352f] mt-1.5"
          />
        )}
      </div>
    );
  };

  const detailOptions = (key: string, allLabel: string) => [
    { value: '', label: allLabel },
    ...(equipments.detailFilterOptions[key] ?? []).map(value => ({
      value,
      label: value,
    })),
  ];

  const hasDetailOptions = (key: string) =>
    (equipments.detailFilterOptions[key]?.length ?? 0) > 0;

  const activeAdvancedCount = [
    equipments.status !== 'TODOS' ? 1 : 0,
    equipments.config !== 'TODOS' ? 1 : 0,
    equipments.city ? 1 : 0,
    equipments.frecuencia ? 1 : 0,
    equipments.marca ? 1 : 0,
    equipments.modelo ? 1 : 0,
    equipments.serie ? 1 : 0,
    equipments.capacidad ? 1 : 0,
    equipments.potencia ? 1 : 0,
    equipments.voltaje ? 1 : 0,
    equipments.fases ? 1 : 0,
    equipments.tipoTablero ? 1 : 0,
    equipments.rpm ? 1 : 0,
    equipments.presion ? 1 : 0,
    equipments.refrigerante ? 1 : 0,
    equipments.tieneVdf !== 'TODOS' ? 1 : 0,
    equipments.anioOperacion ? 1 : 0,
    Object.keys(equipments.detailFilters).length,
    equipments.subtipo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const CONFIG_OPTIONS = [
    { value: 'TODOS', label: 'Todas las configuraciones' },
    { value: 'SI', label: 'Con configuración' },
    { value: 'NO', label: 'Sin configuración' },
  ];

  const cityOptions = [
    { value: '', label: 'Todas las ciudades' },
    ...Array.from(
      new Set(
        equipments.properties.map(p => p.city).filter((c): c is string => !!c),
      ),
    ).map(city => ({ value: city, label: city })),
  ];

  const frequencyOptions = [
    { value: '', label: 'Todas las frecuencias' },
    ...Array.from(
      new Set(
        equipments.equipmentTypes
          .map(t => t.frecuencia)
          .filter((f): f is string => !!f),
      ),
    ).map(freq => ({ value: freq, label: freq })),
  ];

  const selectedSystem = equipments.systems.find(
    s => s.id === equipments.systemId,
  );
  const systemName = selectedSystem?.nombre?.toLowerCase() ?? '';

  const selectedType = equipments.equipmentTypes.find(
    t => t.id === equipments.equipmentTypeId,
  );
  const typeAbbr = selectedType?.abreviatura ?? '';
  const typeName = selectedType?.nombre?.toLowerCase() ?? '';

  const isElectricalPanel =
    typeAbbr === 'TBELEC' ||
    typeName.includes('tablero') ||
    systemName.includes('electr');

  const isHvac =
    typeAbbr === 'HVAC' ||
    typeAbbr === 'AC' ||
    typeAbbr === 'EXTRAC' ||
    typeName.includes('aire') ||
    typeName.includes('extractor') ||
    typeName.includes('chiller') ||
    typeName.includes('ventilad') ||
    systemName.includes('hvac') ||
    systemName.includes('mecan');

  const isPump =
    typeAbbr === 'BOMBA' ||
    typeName.includes('bomba') ||
    typeName.includes('motor') ||
    systemName.includes('sanitar') ||
    systemName.includes('agua');

  const VDF_OPTIONS = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'SI', label: 'Con VDF' },
    { value: 'NO', label: 'Sin VDF' },
  ];

  const selectedProperties = equipments.properties.filter(item =>
    equipments.propertyIds.includes(item.id),
  );
  const filteredProperties = equipments.properties.filter(item =>
    item.name.toLowerCase().includes(propertySearch.toLowerCase()),
  );

  const systemOptions = [
    { value: '', label: 'Todas las especialidades' },
    ...equipments.systems.map(item => ({
      value: item.id,
      label: item.nombre,
    })),
  ];

  // Dynamically filter equipment types if a system is selected
  let filteredEquipmentTypes = equipments.systemId
    ? equipments.equipmentTypes.filter(
        item => item.systemId === equipments.systemId,
      )
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

  const tipoOptions = [
    { value: '', label: 'Todos los tipos' },
    ...equipments.distinctTipos.map(t => ({
      value: t,
      label: mapTipoLabel(t),
    })),
  ];

  const subtipoOptions = [
    { value: '', label: 'Todos los subtipos' },
    ...equipments.distinctSubtipos.map(st => ({
      value: st,
      label: mapTipoLabel(st),
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
      <section
        className={`grid items-center gap-2.5 max-[1200px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1 ${
          equipments.tipo && equipments.distinctSubtipos.length > 0
            ? 'grid-cols-[1.2fr_1.1fr_1fr_1.1fr_1fr_1fr_auto]'
            : 'grid-cols-[1.2fr_1.2fr_1fr_1.2fr_1fr_auto]'
        }`}>
        <SearchInput
          placeholder="Buscar código o ubicación"
          value={equipments.search}
          onChange={equipments.setSearch}
        />
        <div ref={propertyPickerRef} className="relative min-h-11">
          <button
            type="button"
            onClick={() => setIsPropertyPickerOpen(open => !open)}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] border bg-white px-3 py-2 text-left text-[0.95rem] transition-colors ${
              selectedProperties.length > 0
                ? 'border-emerald-800 text-emerald-950 ring-1 ring-emerald-800/15'
                : 'border-slate-300 text-slate-500 hover:border-slate-400'
            }`}>
            <span className="min-w-0 truncate font-medium">
              {selectedProperties.length === 0
                ? 'Todos los inmuebles'
                : selectedProperties.length === 1
                  ? selectedProperties[0].name
                  : `${selectedProperties.length} inmuebles seleccionados`}
            </span>
            <svg
              className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isPropertyPickerOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true">
              <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
          {isPropertyPickerOpen && (
            <div className="absolute left-0 z-50 mt-2 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(12,23,32,0.18)]">
              <div className="border-b border-slate-100 p-3">
                <input
                  autoFocus
                  type="search"
                  value={propertySearch}
                  onChange={event => setPropertySearch(event.target.value)}
                  placeholder="Buscar inmueble..."
                  className="min-h-10 w-full rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-800 focus:bg-white"
                />
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-xs font-bold text-slate-500">
                  {selectedProperties.length} seleccionado
                  {selectedProperties.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => equipments.handlePropertyIdsChange([])}
                  className="text-xs font-black text-emerald-800 hover:text-emerald-950">
                  Limpiar
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5">
                {filteredProperties.map(property => {
                  const isSelected = equipments.propertyIds.includes(
                    property.id,
                  );
                  return (
                    <label
                      key={property.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          equipments.handlePropertyIdsChange(
                            isSelected
                              ? equipments.propertyIds.filter(
                                  id => id !== property.id,
                                )
                              : [...equipments.propertyIds, property.id],
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {property.name}
                      </span>
                      {property.city && (
                        <span className="text-xs text-slate-400">
                          {property.city}
                        </span>
                      )}
                    </label>
                  );
                })}
                {filteredProperties.length === 0 && (
                  <p className="px-3 py-5 text-center text-sm text-slate-400">
                    No se encontraron inmuebles.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <SearchableSelect
          value={equipments.systemId}
          options={systemOptions}
          onChange={equipments.handleSystemChange}
          placeholder="Todas las especialidades"
        />
        <SearchableSelect
          value={equipments.equipmentTypeId}
          options={equipmentTypeOptions}
          onChange={equipments.handleEquipmentTypeChange}
          placeholder="Todos los tipos de activo"
        />
        <SearchableSelect
          value={equipments.tipo}
          options={tipoOptions}
          onChange={equipments.handleTipoChange}
          placeholder="Todos los tipos"
        />
        {equipments.tipo && equipments.distinctSubtipos.length > 0 && (
          <SearchableSelect
            value={equipments.subtipo}
            options={subtipoOptions}
            onChange={equipments.handleSubtipoChange}
            placeholder="Todos los subtipos"
          />
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-4 text-[0.95rem] font-bold shadow-sm transition-all duration-200 ${
              activeAdvancedCount > 0
                ? 'border-emerald-800 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/80 ring-2 ring-emerald-800/10'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.24 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
              />
            </svg>
            <span>Más Filtros</span>
            {activeAdvancedCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-[0.7rem] font-black text-white">
                {activeAdvancedCount}
              </span>
            )}
          </button>

          {isFilterOpen && (
            <>
              {/* Overlay / Background Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-[#061711]/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setIsFilterOpen(false)}
              />

              <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[34rem] justify-end max-[640px]:max-w-full">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="advanced-filters-title"
                  className="relative flex h-dvh w-full flex-col overflow-hidden border-l border-white/40 bg-[#f8faf6] shadow-[-25px_0_60px_-15px_rgba(2,18,14,0.35)] animate-in slide-in-from-right duration-200">
                  <div className="relative overflow-hidden border-b border-emerald-950/10 bg-[radial-gradient(circle_at_0%_0%,rgba(190,242,100,0.35),transparent_40%),linear-gradient(135deg,#07352f_0%,#0b1f28_100%)] px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3
                          id="advanced-filters-title"
                          className="m-0 text-lg font-black tracking-[-0.03em]">
                          Filtros Avanzados
                        </h3>
                        <p className="m-0 mt-0.5 text-xs font-semibold text-emerald-50/70">
                          Personaliza la búsqueda por especificaciones técnicas
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-bold text-white transition hover:bg-white/20"
                        aria-label="Cerrar filtros">
                        x
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    <div className="grid grid-cols-2 gap-3.5 border-b border-slate-100 pb-5 max-[480px]:grid-cols-1">
                      <span className="col-span-full text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                        Campos Operativos
                      </span>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-bold text-slate-500">
                          Estado
                        </label>
                        <SelectField
                          value={equipments.status}
                          options={STATUS_OPTIONS}
                          onChange={equipments.handleStatusChange}
                          ariaLabel="Filtrar por estado"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-bold text-slate-500">
                          Configuración
                        </label>
                        <SelectField
                          value={equipments.config}
                          options={CONFIG_OPTIONS}
                          onChange={equipments.handleConfigChange}
                          ariaLabel="Filtrar por configuración"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-bold text-slate-500">
                          Ciudad
                        </label>
                        <SelectField
                          value={equipments.city}
                          options={cityOptions}
                          onChange={equipments.handleCityChange}
                          ariaLabel="Filtrar por ciudad"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-bold text-slate-500">
                          Frecuencia de Mantenimiento
                        </label>
                        <SelectField
                          value={equipments.frecuencia}
                          options={frequencyOptions}
                          onChange={equipments.handleFrecuenciaChange}
                          ariaLabel="Filtrar por frecuencia"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 max-[480px]:grid-cols-1">
                      <span className="col-span-full text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                        Detalle Técnico: {selectedType?.nombre || 'General'}
                      </span>

                      {hasDetailOptions('anio_operacion') && (
                        <div className="grid gap-1.5">
                          <label className="text-xs font-bold text-slate-500">
                            Año de operación
                          </label>
                          <SearchableSelect
                            value={equipments.anioOperacion}
                            options={detailOptions(
                              'anio_operacion',
                              'Todos los años',
                            )}
                            onChange={equipments.handleAnioOperacionChange}
                            placeholder="Todos los años"
                          />
                        </div>
                      )}

                      {isElectricalPanel && (
                        <>
                          {hasDetailOptions('fases') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Fases
                              </label>
                              <SelectField
                                value={equipments.fases}
                                options={detailOptions(
                                  'fases',
                                  'Todas las fases',
                                )}
                                onChange={equipments.handleFasesChange}
                                ariaLabel="Filtrar por fases"
                              />
                            </div>
                          )}
                          {hasDetailOptions('voltaje') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Voltaje
                              </label>
                              <SelectField
                                value={equipments.voltaje}
                                options={detailOptions(
                                  'voltaje',
                                  'Todos los voltajes',
                                )}
                                onChange={equipments.handleVoltajeChange}
                                ariaLabel="Filtrar por voltaje"
                              />
                            </div>
                          )}
                          {hasDetailOptions('tipo_tablero') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Tipo de Tablero
                              </label>
                              <SelectField
                                value={equipments.tipoTablero}
                                options={detailOptions(
                                  'tipo_tablero',
                                  'Todos los tipos',
                                )}
                                onChange={equipments.handleTipoTableroChange}
                                ariaLabel="Filtrar por tipo de tablero"
                              />
                            </div>
                          )}
                          {renderMarcaField()}
                        </>
                      )}

                      {isHvac && (
                        <>
                          {renderMarcaField()}
                          {hasDetailOptions('modelo') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Modelo
                              </label>
                              <SearchableSelect
                                value={equipments.modelo}
                                options={detailOptions(
                                  'modelo',
                                  'Todos los modelos',
                                )}
                                onChange={equipments.handleModeloChange}
                                placeholder="Todos los modelos"
                              />
                            </div>
                          )}
                          {hasDetailOptions('capacidad') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Capacidad
                              </label>
                              <SearchableSelect
                                value={equipments.capacidad}
                                options={detailOptions(
                                  'capacidad',
                                  'Todas las capacidades',
                                )}
                                onChange={equipments.handleCapacidadChange}
                                placeholder="Todas las capacidades"
                              />
                            </div>
                          )}
                          {hasDetailOptions('refrigerante') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Refrigerante
                              </label>
                              <SelectField
                                value={equipments.refrigerante}
                                options={detailOptions(
                                  'refrigerante',
                                  'Todos los refrigerantes',
                                )}
                                onChange={equipments.handleRefrigeranteChange}
                                ariaLabel="Filtrar por refrigerante"
                              />
                            </div>
                          )}
                          {hasDetailOptions('tiene_vdf') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Variador de Frecuencia (VDF)
                              </label>
                              <SelectField
                                value={equipments.tieneVdf}
                                options={VDF_OPTIONS}
                                onChange={equipments.handleTieneVdfChange}
                                ariaLabel="Filtrar por tiene vdf"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {isPump && (
                        <>
                          {renderMarcaField()}
                          {hasDetailOptions('potencia') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Potencia
                              </label>
                              <SearchableSelect
                                value={equipments.potencia}
                                options={detailOptions(
                                  'potencia',
                                  'Todas las potencias',
                                )}
                                onChange={equipments.handlePotenciaChange}
                                placeholder="Todas las potencias"
                              />
                            </div>
                          )}
                          {hasDetailOptions('rpm') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                RPM
                              </label>
                              <SearchableSelect
                                value={equipments.rpm}
                                options={detailOptions(
                                  'rpm',
                                  'Todas las velocidades',
                                )}
                                onChange={equipments.handleRpmChange}
                                placeholder="Todas las velocidades"
                              />
                            </div>
                          )}
                          {hasDetailOptions('presion') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Presión
                              </label>
                              <SearchableSelect
                                value={equipments.presion}
                                options={detailOptions(
                                  'presion',
                                  'Todas las presiones',
                                )}
                                onChange={equipments.handlePresionChange}
                                placeholder="Todas las presiones"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {!isElectricalPanel && !isHvac && !isPump && (
                        <>
                          {renderMarcaField()}
                          {hasDetailOptions('modelo') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Modelo
                              </label>
                              <SearchableSelect
                                value={equipments.modelo}
                                options={detailOptions(
                                  'modelo',
                                  'Todos los modelos',
                                )}
                                onChange={equipments.handleModeloChange}
                                placeholder="Todos los modelos"
                              />
                            </div>
                          )}
                          {hasDetailOptions('serie') && (
                            <div className="grid gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                Número de Serie
                              </label>
                              <SearchableSelect
                                value={equipments.serie}
                                options={detailOptions(
                                  'serie',
                                  'Todas las series',
                                )}
                                onChange={equipments.handleSerieChange}
                                placeholder="Todas las series"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {equipments.additionalDetailFilters
                        .filter(filter => hasDetailOptions(filter.key))
                        .map(filter => (
                          <div key={filter.key} className="grid gap-1.5">
                            <label className="text-xs font-bold text-slate-500">
                              {filter.label}
                            </label>
                            <SearchableSelect
                              value={equipments.detailFilters[filter.key] ?? ''}
                              options={detailOptions(
                                filter.key,
                                `Todos los valores`,
                              )}
                              onChange={value =>
                                equipments.handleDetailFilterChange(
                                  filter.key,
                                  value,
                                )
                              }
                              placeholder="Todos los valores"
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-900/10 bg-white/90 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrandOption('');
                        setCustomBrandText('');
                        equipments.clearFilters();
                        setIsFilterOpen(false);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
                      Restablecer todo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="rounded-full bg-[#0c1720] px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#07352f] transition-all">
                      Aplicar filtros
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
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
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
          <p className="text-sm text-slate-500 font-medium">
            Cargando activos...
          </p>
        </div>
      }>
      <AdminEquipmentsContent />
    </Suspense>
  );
}
