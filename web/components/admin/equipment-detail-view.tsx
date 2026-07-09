'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Database,
  Server,
  Cpu,
  Zap,
  XCircle,
  ChevronDown,
} from 'lucide-react';

import { StatusBadge } from '@/components/admin/status-badge';
import { Alert } from '@/components/ui/alert';
import type { AdminEquipmentDetailRow } from '@/types/admin';
import { formatDateTime } from '@/utils/date';
import { ElectricalPanelDetail } from '@/components/admin/electrical-panel-detail';

interface EquipmentDetailViewProps {
  equipment: AdminEquipmentDetailRow | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onBackClick?: () => void;
  backHref?: string;
  backText?: string;
}

export function EquipmentDetailView({
  equipment,
  isLoading = false,
  errorMessage = null,
  onBackClick,
  backHref,
  backText,
}: EquipmentDetailViewProps) {
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

  const isElectricalPanel = useMemo(() => {
    if (!equipment) return false;
    const isAbbrMatch = equipment.equipmentAbbreviation === 'TBELEC';
    const hasItgData = !!(
      equipment.equipment_detail &&
      typeof equipment.equipment_detail === 'object' &&
      'itgs' in equipment.equipment_detail
    );
    return isAbbrMatch || hasItgData;
  }, [equipment]);

  if (isLoading) {
    return (
      <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <DetailHeader
          equipment={undefined}
          backHref={backHref}
          onBackClick={onBackClick}
          backText={backText}
        />
        <section className="grid min-h-[300px] place-items-center rounded-[22px] border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-10 w-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-10 w-10 bg-emerald-500 items-center justify-center text-white">
                <Zap className="h-5 w-5 animate-pulse" />
              </span>
            </div>
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase animate-pulse">
              Cargando datos del activo...
            </span>
          </div>
        </section>
      </main>
    );
  }

  if (!equipment) {
    return (
      <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <DetailHeader
          equipment={undefined}
          backHref={backHref}
          onBackClick={onBackClick}
          backText={backText}
        />
        {errorMessage && <Alert>{errorMessage}</Alert>}
        <section className="rounded-[22px] border border-red-100 bg-red-50/30 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
            <XCircle className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Activo No Encontrado
          </h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            El identificador del activo no es válido o fue eliminado del sistema.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      <DetailHeader
        equipment={equipment}
        backHref={backHref}
        onBackClick={onBackClick}
        backText={backText}
      />
      {errorMessage && <Alert>{errorMessage}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Sección Principal (Detalles) */}
        <div className="space-y-6">
          {isElectricalPanel ? (
            <div className="rounded-[22px] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="m-0 text-[13px] font-black uppercase tracking-[0.12em] text-slate-800">
                    Detalle Estructurado del Tablero Eléctrico
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-slate-400 font-medium">
                    Especificación técnica detallada de interruptores e ITGs.
                  </p>
                </div>
              </div>
              <div className="p-6">
                <ElectricalPanelDetail data={equipment.equipment_detail} />
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200/40">
                  <Cpu className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="m-0 text-[13px] font-black uppercase tracking-[0.12em] text-slate-800">
                    Detalles y Especificaciones del Activo
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-slate-400 font-medium">
                    Información técnica específica guardada en la base de datos.
                  </p>
                </div>
              </div>
              <div className="p-6">
                <JsonValue value={equipment.equipment_detail} />
              </div>
            </div>
          )}
        </div>

        {/* Barra Lateral (Contexto) */}
        <div className="space-y-6">
          {/* Card 1: Ubicación */}
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <MapPin className="h-4 w-4" />
              </div>
              <h2 className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-slate-800">
                Ubicación del Activo
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Inmueble
                </span>
                <span className="mt-0.5 block font-bold text-slate-800 text-sm">
                  {equipment.propertyName}
                </span>
                {equipment.propertyCode && (
                  <span className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600">
                    Cód: {equipment.propertyCode}
                  </span>
                )}
              </div>

              {(equipment.propertyAddress || equipment.propertyCity) && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Dirección
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-slate-600">
                    {equipment.propertyAddress
                      ? `${equipment.propertyAddress}, `
                      : ''}
                    {equipment.propertyCity}
                  </span>
                </div>
              )}

              {equipment.ubicacion && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Zona / Sector
                  </span>
                  <span className="mt-1 inline-flex items-center rounded-lg bg-emerald-50/50 border border-emerald-100/50 px-2 py-1 text-xs font-bold text-emerald-800">
                    {equipment.ubicacion}
                  </span>
                </div>
              )}

              {equipment.detalle_ubicacion && (
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100/50">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Detalle de Ubicación
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-600 leading-relaxed">
                    {equipment.detalle_ubicacion}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Clasificación */}
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Server className="h-4 w-4" />
              </div>
              <h2 className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-slate-800">
                Clasificación y Tipo
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Especialidad
                </span>
                <span className="mt-0.5 block text-xs font-bold text-slate-800">
                  {equipment.systemName || '-'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Categoría
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-600">
                  {equipment.equipmentName}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Frecuencia
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-600">
                  {equipment.equipmentFrequency || 'No programada'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Auditoría */}
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-slate-800">
                Historial de Registro
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-400">Creado</span>
                <span className="font-mono text-slate-700 text-[11px] font-medium text-right">
                  {formatDateTime(
                    firstDate(equipment.created_at, equipment.created),
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2 border-t border-slate-50 pt-2.5">
                <span className="font-semibold text-slate-400">Actualizado</span>
                <span className="font-mono text-slate-700 text-[11px] font-medium text-right">
                  {formatDateTime(
                    firstDate(equipment.updated_at, equipment.updated),
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Acordeón de Campos Sincronizados */}
          <details className="group rounded-[22px] border border-slate-200/80 bg-white shadow-sm overflow-hidden transition-all duration-300">
            <summary className="flex items-center justify-between p-4.5 cursor-pointer select-none hover:bg-slate-50/50 list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-slate-100">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
                    Campos Sincronizados
                  </h2>
                  <p className="m-0 text-[10px] text-slate-400 font-semibold mt-0.5">
                    {savedFields.length} campos crudos
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
            </summary>
            <div className="border-t border-slate-100 p-4 bg-slate-50/30 space-y-2 max-h-[350px] overflow-y-auto">
              <p className="m-0 text-[10px] font-semibold text-slate-400 italic mb-2">
                Valores operativos directos de la tabla de base de datos.
              </p>
              {savedFields.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-slate-100 bg-white p-2.5 text-[11px] shadow-sm">
                  <span className="block font-bold text-slate-400 text-[9px] uppercase tracking-wider font-mono">
                    {key}
                  </span>
                  <span className="mt-0.5 block break-all font-semibold text-slate-700 font-mono text-[11px]">
                    {formatUnknown(value)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}

interface DetailHeaderProps {
  equipment?: AdminEquipmentDetailRow;
  backHref?: string;
  onBackClick?: () => void;
  backText?: string;
}

function DetailHeader({
  equipment,
  backHref = '/admin/equipos',
  onBackClick,
  backText = 'Volver a activos',
}: DetailHeaderProps) {
  if (onBackClick) {
    return (
      <header className="flex flex-col gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <button
            type="button"
            onClick={onBackClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 text-xs font-bold text-slate-600 transition-all duration-200 hover:-translate-x-0.5 active:translate-x-0 active:scale-95 shadow-sm border border-slate-200/40 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            {backText}
          </button>
        </div>

        {equipment && <EquipmentInfoSection equipment={equipment} />}
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-4 border-b border-slate-200/60 pb-5">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 text-xs font-bold text-slate-600 no-underline transition-all duration-200 hover:-translate-x-0.5 active:translate-x-0 active:scale-95 shadow-sm border border-slate-200/40"
          href={backHref}>
          <ArrowLeft className="w-3.5 h-3.5" />
          {backText}
        </Link>
      </div>

      {equipment && <EquipmentInfoSection equipment={equipment} />}
    </header>
  );
}

function EquipmentInfoSection({ equipment }: { equipment: AdminEquipmentDetailRow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 text-xl font-black tracking-tight text-slate-800 font-mono">
            {equipment.codigo ?? 'Sin código'}
          </h1>
          {equipment.equipmentAbbreviation && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
              {equipment.equipmentAbbreviation}
            </span>
          )}
          {equipment.config !== null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                equipment.config
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
              {equipment.config ? 'Configurado' : 'Pendiente'}
            </span>
          )}
        </div>
        <p className="m-0 text-xs font-semibold text-slate-500">
          {equipment.propertyName} · {equipment.equipmentName}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Estado:
        </span>
        <StatusBadge>{equipment.estatus}</StatusBadge>
      </div>
    </div>
  );
}

function formatTechnicalKey(key: string): string {
  const lowerKey = key.toLowerCase();
  const dictionary: Record<string, string> = {
    tiene_vdf: '¿Tiene variador de frecuencia (VDF)?',
    vdf: 'Variador de frecuencia (VDF)',
    marca: 'Marca',
    modelo: 'Modelo',
    serie: 'Número de Serie',
    capacidad: 'Capacidad',
    potencia: 'Potencia',
    voltaje: 'Voltaje',
    corriente: 'Corriente (Amperaje)',
    fases: 'Fases',
    presion: 'Presión',
    temperatura: 'Temperatura',
    rpm: 'RPM (Velocidad)',
    frecuencia: 'Frecuencia',
    refrigerante: 'Tipo de Refrigerante',
    aceite: 'Tipo de Aceite',
    filtro: 'Filtro',
    ubicacion_exacta: 'Ubicación Exacta',
  };

  return dictionary[lowerKey] ?? key.replace(/_/g, ' ');
}

interface JsonValueProps {
  value: unknown;
}

function JsonValue({ value }: JsonValueProps) {
  if (isEmptyValue(value)) {
    return (
      <p className="m-0 text-xs font-semibold text-slate-400 italic">
        Sin detalle guardado.
      </p>
    );
  }

  let parsedValue = value;
  if (typeof value === 'string') {
    try {
      const trimmed = value.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        parsedValue = JSON.parse(value);
      }
    } catch {
      // Ignorar error y usar como string simple
    }
  }

  if (Array.isArray(parsedValue)) {
    if (parsedValue.length === 0) {
      return (
        <p className="m-0 text-xs font-semibold text-slate-400 italic">
          Sin elementos.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {parsedValue.map((item, idx) => (
          <SubcomponentCard key={idx} index={idx} item={item} />
        ))}
      </div>
    );
  }

  if (isRecord(parsedValue)) {
    const entries = Object.entries(parsedValue).filter(([key, entryValue]) => {
      if (isEmptyValue(entryValue)) return false;
      if (Array.isArray(entryValue) && entryValue.length === 0) return false;

      // Filter out technical ID fields and duplicates
      const normalizedKey = key.toLowerCase().replace(/_/g, ' ').trim();
      if (
        key === 'id' ||
        key.endsWith('_id') ||
        key.startsWith('id_') ||
        normalizedKey === 'id' ||
        normalizedKey.endsWith(' id') ||
        normalizedKey.startsWith('id ')
      ) {
        return false;
      }

      if (
        normalizedKey === 'marca catalogo' ||
        normalizedKey === 'marca_catalogo' ||
        normalizedKey === 'marca otro' ||
        normalizedKey === 'marca_otro'
      ) {
        return false;
      }

      if (normalizedKey === 'tiene vdf' || normalizedKey === 'tiene_vdf') {
        return false;
      }

      return true;
    });

    if (entries.length === 0) {
      return (
        <p className="m-0 text-xs font-semibold text-slate-400 italic">
          Sin detalle guardado.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
        {entries.map(([key, entryValue]) => {
          if (Array.isArray(entryValue)) {
            return (
              <div key={key} className="col-span-2">
                <span className="mb-2 block font-black text-slate-600 uppercase tracking-wider text-[10px]">
                  {formatTechnicalKey(key)}
                </span>
                <JsonValue value={entryValue} />
              </div>
            );
          }

          if (isRecord(entryValue)) {
            return (
              <div
                key={key}
                className="col-span-2 rounded-[20px] border border-slate-300 border-l-4 border-l-emerald-500 bg-slate-50/80 p-5 space-y-4 shadow-sm">
                <span className="block font-black text-slate-800 uppercase tracking-[0.12em] text-[11px] border-b border-slate-200 pb-2">
                  {formatTechnicalKey(key)}
                </span>
                <div className="pl-1">
                  <JsonValue value={entryValue} />
                </div>
              </div>
            );
          }

          return (
            <div
              key={key}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs transition-colors hover:bg-slate-50">
              <span className="block font-bold text-slate-400 uppercase tracking-wider text-[9px]">
                {formatTechnicalKey(key)}
              </span>
              <span className="mt-1 block break-words font-semibold text-slate-800 text-[13px] whitespace-pre-line">
                {formatUnknown(entryValue)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <pre className="m-0 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3.5 text-xs font-mono font-semibold text-slate-100 whitespace-pre-wrap">
      {formatUnknown(parsedValue)}
    </pre>
  );
}

interface SubcomponentCardProps {
  item: unknown;
  index: number;
}

function SubcomponentCard({ item, index }: SubcomponentCardProps) {
  const label =
    isRecord(item) && typeof item['tipo'] === 'string'
      ? item['tipo']
      : `Ítem ${index + 1}`;

  const displayLabel = formatTechnicalKey(label);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">
          {index + 1}
        </span>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
          {displayLabel}
        </span>
      </div>
      {/* Contenido de la tarjeta */}
      <div className="grid grid-cols-2 gap-2.5 p-3.5 max-[480px]:grid-cols-1">
        {isRecord(item)
          ? Object.entries(item)
              .filter(([k]) => k !== 'tipo')
              .map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {formatTechnicalKey(k)}
                  </span>
                  <span className="mt-0.5 block break-words text-[12px] font-semibold text-slate-800">
                    {formatUnknown(v)}
                  </span>
                </div>
              ))
          : (
            <span className="col-span-2 text-[12px] font-semibold text-slate-700">
              {formatUnknown(item)}
            </span>
          )}
      </div>
    </div>
  );
}

function firstDate(...values: (string | null)[]) {
  return values.find(Boolean) ?? null;
}

function formatUnknown(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([k]) => {
      const normalizedK = k.toLowerCase().replace(/_/g, ' ').trim();
      if (
        k === 'id' ||
        k.endsWith('_id') ||
        k.startsWith('id_') ||
        normalizedK === 'id' ||
        normalizedK.endsWith(' id') ||
        normalizedK.startsWith('id ')
      ) {
        return false;
      }
      if (
        normalizedK === 'marca catalogo' ||
        normalizedK === 'marca_catalogo' ||
        normalizedK === 'marca otro' ||
        normalizedK === 'marca_otro' ||
        normalizedK === 'tiene vdf' ||
        normalizedK === 'tiene_vdf'
      ) {
        return false;
      }
      return true;
    });

    if (entries.length === 0) return '-';
    if (entries.length === 1) {
      return formatUnknown(entries[0][1]);
    }
    return entries
      .map(([k, v]) => `${formatTechnicalKey(k)}: ${formatUnknown(v)}`)
      .join('\n');
  }

  try {
    return JSON.stringify(value);
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
