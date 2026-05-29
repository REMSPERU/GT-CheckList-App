'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';

import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SelectField } from '@/components/ui/select-field';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import { listAdminEquipmentsForQr } from '@/services/admin/equipments.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type {
  AdminEquipmentQrRow,
  AdminEquipmentTypeRow,
  AdminPropertyRow,
} from '@/types/admin';
import { useDebouncedValue } from '@/hooks/admin/use-debounced-value';

const STATUS_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

export default function AdminEquipmentQrPage() {
  const [items, setItems] = useState<AdminEquipmentQrRow[]>([]);
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [systems, setSystems] = useState<{ id: string; nombre: string }[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>(
    [],
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVO');
  const [propertyId, setPropertyId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        const supabase = getSupabaseClient();
        const [propertyRows, typeRows, systemResult] = await Promise.all([
          listAdminProperties(supabase),
          listAdminEquipmentTypes(supabase),
          supabase
            .from('sistemas')
            .select('id, nombre')
            .order('nombre', { ascending: true }),
        ]);

        if (!isMounted) return;

        setProperties(propertyRows);
        setEquipmentTypes(typeRows);
        setSystems(
          (systemResult.data ?? []) as { id: string; nombre: string }[],
        );
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los filtros',
          );
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadQrItems() {
      if (!propertyId) {
        setItems([]);
        setIsLoading(false);
        setErrorMessage(null);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const rows = await listAdminEquipmentsForQr(supabase, {
          search: debouncedSearch,
          status,
          propertyId,
          systemId,
          equipmentTypeId,
        });

        if (isMounted) {
          setItems(rows);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los QRs',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadQrItems();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, equipmentTypeId, propertyId, status, systemId]);

  const propertyOptions = useMemo(
    () => [
      { value: '', label: 'Todos los inmuebles' },
      ...properties.map(item => ({ value: item.id, label: item.name })),
    ],
    [properties],
  );

  const systemOptions = useMemo(
    () => [
      { value: '', label: 'Todos los sistemas' },
      ...systems.map(item => ({ value: item.id, label: item.nombre })),
    ],
    [systems],
  );

  const equipmentTypeOptions = useMemo(() => {
    const filteredTypes = systemId
      ? equipmentTypes.filter(item => item.systemId === systemId)
      : equipmentTypes;

    return [
      { value: '', label: 'Todos los tipos de equipo' },
      ...filteredTypes.map(item => ({ value: item.id, label: item.nombre })),
    ];
  }, [equipmentTypes, systemId]);

  function handleSystemChange(nextSystemId: string) {
    setSystemId(nextSystemId);
    setEquipmentTypeId('');
  }

  return (
    <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      <header className="qr-print-controls flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-bold text-[#0c1720] no-underline transition-colors hover:bg-slate-200"
            href="/admin/equipos">
            ← Volver a equipos
          </Link>
          <h1 className="m-0 mt-3 text-2xl font-black tracking-[-0.04em] text-[#0c1720]">
            QRs de equipos
          </h1>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
            Cada QR contiene el código. La impresión agrega tipo y ubicación como referencia.
          </p>
        </div>
        <button
          className="rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#0c1720] disabled:cursor-not-allowed disabled:opacity-55"
          type="button"
          onClick={() => window.print()}
          disabled={!propertyId || items.length === 0 || isLoading}>
          Imprimir
        </button>
      </header>

      <section className="qr-print-controls grid grid-cols-[1.2fr_1fr_1fr_1.2fr_0.8fr] gap-2.5 max-[1200px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
        <SearchInput
          placeholder="Buscar codigo o ubicacion"
          value={search}
          onChange={setSearch}
        />
        <SearchableSelect
          value={propertyId}
          options={propertyOptions}
          onChange={setPropertyId}
          placeholder="Todos los inmuebles"
        />
        <SelectField
          value={systemId}
          options={systemOptions}
          onChange={handleSystemChange}
          ariaLabel="Filtrar por sistema"
        />
        <SelectField
          value={equipmentTypeId}
          options={equipmentTypeOptions}
          onChange={setEquipmentTypeId}
          ariaLabel="Filtrar por tipo de equipo"
        />
        <SelectField
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
          ariaLabel="Filtrar por estado"
        />
      </section>

      <Alert>{errorMessage}</Alert>

      <section className="qr-print-controls rounded-[18px] border border-slate-900/10 bg-white/80 px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
        {!propertyId
          ? 'Selecciona un inmueble para generar sus QRs.'
          : isLoading
            ? 'Cargando QRs...'
            : `${items.length} QRs listos para imprimir`}
      </section>

      <section className="qr-print-grid grid grid-cols-4 gap-3 max-[1100px]:grid-cols-3 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1">
        {items.map(item => (
          <article
            className="qr-print-card grid justify-items-center gap-3 rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-center shadow-sm"
            key={item.id}>
            <QRCode
              className="qr-print-code h-auto w-full max-w-[150px]"
              value={item.codigo}
              viewBox="0 0 256 256"
            />
            <span className="qr-print-id break-all font-mono text-[0.68rem] font-black leading-snug text-[#0c1720]">
              {item.codigo}
            </span>
            <div className="qr-print-meta grid gap-1 text-center text-[0.62rem] font-semibold leading-tight text-slate-500">
              <span>{item.equipmentName}</span>
              <span>
                {[item.ubicacion, item.detalle_ubicacion]
                  .filter(Boolean)
                  .join(' · ') || '-'}
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
