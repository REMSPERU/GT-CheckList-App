'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { StatusBadge } from '@/components/admin/status-badge';
import { Alert } from '@/components/ui/alert';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { getAdminEquipmentById } from '@/services/admin/equipments.service';
import type { AdminEquipmentDetailRow } from '@/types/admin';
import { formatDateTime } from '@/utils/date';

export default function AdminEquipmentDetailPage() {
  const params = useParams<{ equipmentId: string }>();
  const [equipment, setEquipment] = useState<AdminEquipmentDetailRow | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipment() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await getAdminEquipmentById(
          supabase,
          params.equipmentId,
        );

        if (isMounted) setEquipment(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el equipo',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadEquipment();

    return () => {
      isMounted = false;
    };
  }, [params.equipmentId]);

  const savedFields = useMemo(() => {
    if (!equipment) return [];

    return Object.entries(equipment.rawData)
      .filter(
        ([key]) =>
          key !== 'equipment_detail' &&
          key !== 'properties' &&
          !isTechnicalIdField(key),
      )
      .sort(([first], [second]) => first.localeCompare(second));
  }, [equipment]);

  if (isLoading) {
    return (
      <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <DetailHeader />
        <section className="grid min-h-[260px] place-items-center rounded-[22px] border border-slate-900/10 bg-white/80 text-sm font-semibold text-slate-500 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          Cargando datos del equipo...
        </section>
      </main>
    );
  }

  if (!equipment) {
    return (
      <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <DetailHeader />
        <Alert>{errorMessage}</Alert>
        <section className="rounded-[22px] border border-slate-900/10 bg-white/80 p-6 text-sm text-slate-500 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
          No se encontro este equipo.
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      <DetailHeader equipment={equipment} />
      <Alert>{errorMessage}</Alert>

      <section className="grid grid-cols-[1.1fr_1fr_1fr] gap-3 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        <CompactCard title="Identificacion">
          <KeyValue label="Codigo" value={equipment.codigo} emphasis />
          <KeyValue
            label="Estado"
            value={<StatusBadge>{equipment.estatus}</StatusBadge>}
          />
          <KeyValue
            label="Configurado"
            value={formatBoolean(equipment.config)}
          />
        </CompactCard>

        <CompactCard title="Ubicacion">
          <KeyValue label="Inmueble" value={equipment.propertyName} emphasis />
          <KeyValue label="Codigo inmueble" value={equipment.propertyCode} />
          <KeyValue label="Ciudad" value={equipment.propertyCity} />
          <KeyValue label="Direccion" value={equipment.propertyAddress} />
          <KeyValue label="Zona" value={equipment.ubicacion} />
          <KeyValue label="Detalle" value={equipment.detalle_ubicacion} />
        </CompactCard>

        <CompactCard title="Tipo de equipo">
          <KeyValue label="Sistema" value={equipment.systemName} emphasis />
          <KeyValue label="Tipo" value={equipment.equipmentName} />
          <KeyValue
            label="Abreviatura"
            value={equipment.equipmentAbbreviation}
          />
          <KeyValue label="Frecuencia" value={equipment.equipmentFrequency} />
        </CompactCard>
      </section>

      <section className="grid grid-cols-[0.9fr_1.1fr] gap-3 max-[980px]:grid-cols-1">
        <CompactCard title="Auditoria">
          <KeyValue
            label="Creado"
            value={formatDateTime(
              firstDate(equipment.created_at, equipment.created),
            )}
          />
          <KeyValue
            label="Actualizado"
            value={formatDateTime(
              firstDate(equipment.updated_at, equipment.updated),
            )}
          />
        </CompactCard>

        <CompactCard title="Detalle guardado">
          <JsonValue value={equipment.equipment_detail} />
        </CompactCard>
      </section>

      <section className="rounded-[22px] border border-slate-900/10 bg-white/85 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div className="border-b border-slate-200 px-4 py-3">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Campos crudos sincronizados
          </span>
          <p className="m-0 mt-1 text-xs font-semibold text-slate-500">
            Vista compacta de campos operativos guardados en la tabla equipos.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3 max-[1180px]:grid-cols-2 max-[720px]:grid-cols-1">
          {savedFields.map(([key, value]) => (
            <RawField fieldKey={key} key={key} value={value} />
          ))}
        </div>
      </section>
    </main>
  );
}

interface DetailHeaderProps {
  equipment?: AdminEquipmentDetailRow;
}

function DetailHeader({ equipment }: DetailHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <Link
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-bold text-[#0c1720] no-underline transition-colors hover:bg-slate-200"
        href="/admin/equipos">
        ← Volver a equipos
      </Link>
      {equipment ? (
        <div className="text-right max-[640px]:text-left">
          <span className="block text-sm font-black text-[#0c1720]">
            {equipment.codigo ?? 'Sin codigo'}
          </span>
          <span className="block text-xs font-semibold text-slate-500">
            {equipment.propertyName} · {equipment.equipmentName}
          </span>
        </div>
      ) : null}
    </header>
  );
}

interface CompactCardProps {
  title: string;
  children: React.ReactNode;
}

function CompactCard({ title, children }: CompactCardProps) {
  return (
    <section className="rounded-[18px] border border-slate-900/10 bg-white/85 p-3 shadow-sm">
      <h2 className="m-0 mb-2 text-[0.7rem] font-black uppercase tracking-[0.16em] text-emerald-800">
        {title}
      </h2>
      <div className="grid gap-1.5">{children}</div>
    </section>
  );
}

interface KeyValueProps {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
  mono?: boolean;
}

function KeyValue({
  label,
  value,
  emphasis = false,
  mono = false,
}: KeyValueProps) {
  return (
    <div className="grid grid-cols-[116px_1fr] gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs">
      <span className="font-black uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <span
        className={`min-w-0 break-words font-semibold text-[#0c1720] ${
          emphasis ? 'text-sm' : ''
        } ${mono ? 'font-mono text-[0.7rem]' : ''}`}>
        {isEmptyValue(value) ? '-' : value}
      </span>
    </div>
  );
}

interface RawFieldProps {
  fieldKey: string;
  value: unknown;
}

function RawField({ fieldKey, value }: RawFieldProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs">
      <span className="block font-black uppercase tracking-[0.08em] text-slate-500">
        {fieldKey}
      </span>
      <span className="mt-1 block break-words font-semibold text-[#0c1720]">
        {formatUnknown(value)}
      </span>
    </div>
  );
}

interface JsonValueProps {
  value: unknown;
}

function JsonValue({ value }: JsonValueProps) {
  if (isEmptyValue(value)) {
    return (
      <p className="m-0 text-xs font-semibold text-slate-500">
        Sin detalle guardado.
      </p>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);

    return (
      <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
        {entries.map(([key, entryValue]) => (
          <RawField fieldKey={key} key={key} value={entryValue} />
        ))}
      </div>
    );
  }

  return (
    <pre className="m-0 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs font-semibold text-slate-100">
      {formatUnknown(value)}
    </pre>
  );
}

function firstDate(...values: (string | null)[]) {
  return values.find(Boolean) ?? null;
}

function formatBoolean(value: boolean | null) {
  if (value === null) return '-';
  return value ? 'Si' : 'No';
}

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTechnicalIdField(key: string) {
  return key === 'id' || key.endsWith('_id') || key.startsWith('id_');
}

function isEmptyValue(value: unknown) {
  return value === null || value === undefined || value === '';
}
