'use client';

import { Suspense, useDeferredValue, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Paperclip,
} from 'lucide-react';

import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { formatExternalStatus } from '@/components/admin/alexperto/quote-formatters';
import { RequestDetailDialog } from '@/components/admin/alexperto/request-detail-dialog';
import { TABLE_CLASS, TH_CLASS } from '@/components/admin/table-primitives';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableMultiSelectField } from '@/components/ui/searchable-multi-select-field';
import { fetchWithAuth } from '@/services/auth/auth.service';
import type {
  AlexpertoRequestListItem,
  AlexpertoRequestListResponse,
} from '@/types/alexperto';

const PAGE_SIZE_OPTIONS = [30, 50, 100];

type DatePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const DATE_PRESET_OPTIONS = [
  { value: 'ALL', label: 'Todas las fechas' },
  { value: 'TODAY', label: 'Hoy' },
  { value: 'WEEK', label: 'Esta semana' },
  { value: 'MONTH', label: 'Último mes' },
  { value: 'CUSTOM', label: 'Personalizado' },
] as const;

const SPECIALTY_OPTIONS = [
  { value: 'AA', label: 'Sistema de aire acondicionado' },
  { value: 'VM', label: 'Equipos de ventilación mecánica' },
  { value: 'SCI', label: 'Sistemas contra incendio' },
  { value: 'TE', label: 'Tableros eléctricos' },
  { value: 'GE', label: 'Grupos electrógenos' },
  { value: 'BOM', label: 'Bombas de agua y desagüe' },
  { value: 'SSC', label: 'Sistemas de seguridad y control' },
  { value: 'SEE', label: 'Sub estación eléctrica' },
  {
    value: 'TTA',
    label: 'Tableros de transferencia | distribución | otros relacionados',
  },
  { value: 'ASC', label: 'Ascensores' },
];

const REQUEST_TYPE_OPTIONS = [
  { value: 'PREVENTIVE', label: 'Preventivo' },
  { value: 'CORRECTIVE', label: 'Correctivo' },
  { value: 'REQUIREMENT', label: 'Requerimiento' },
  { value: 'CAPEX', label: 'CAPEX' },
];

const EXTERNAL_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Programado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'INPROGRESS', label: 'En progreso' },
  { value: 'EXECUTED', label: 'Ejecutado' },
  { value: 'COMPLETED', label: 'Completado' },
];

const GEMA_STATUS_OPTIONS = [
  { value: 'PENDIENTE_REVISION', label: 'Pendiente de revisión' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'CULMINADO', label: 'Culminado' },
  { value: 'VALIDADO', label: 'Marcado como revisado' },
];

function formatRequestType(type: string | null) {
  return (
    REQUEST_TYPE_OPTIONS.find(option => option.value === type)?.label ??
    type ??
    'Sin tipo'
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveDateRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
) {
  if (preset === 'CUSTOM')
    return { from: customFrom || null, to: customTo || null };
  if (preset === 'ALL') return { from: null, to: null };

  const today = new Date();
  const to = formatDateInput(today);
  if (preset === 'TODAY') return { from: to, to };

  const from = new Date(today);
  if (preset === 'WEEK') {
    const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    from.setDate(today.getDate() - daysSinceMonday);
  } else {
    from.setMonth(today.getMonth() - 1);
  }
  return { from: formatDateInput(from), to };
}

function internalStatusBadge(status: string) {
  const styles =
    status === 'CULMINADO' || status === 'VALIDADO'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'OBSERVADO'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';
  const Icon =
    status === 'CULMINADO' || status === 'VALIDADO'
      ? CheckCircle2
      : status === 'OBSERVADO'
        ? AlertCircle
        : Clock;
  const label =
    status === 'VALIDADO'
      ? 'Revisado'
      : status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${styles}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

function SolicitudesContent() {
  const [requests, setRequests] = useState<AlexpertoRequestListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [search, setSearch] = useState('');
  const [selectedRequestTypes, setSelectedRequestTypes] = useState<string[]>(
    [],
  );
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedExternalStatuses, setSelectedExternalStatuses] = useState<
    string[]
  >([]);
  const [selectedGemaStatuses, setSelectedGemaStatuses] = useState<string[]>(
    [],
  );
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [propertyOptions, setPropertyOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<AlexpertoRequestListItem | null>(null);
  const deferredSearch = useDeferredValue(search);
  const dateRange = resolveDateRange(datePreset, customDateFrom, customDateTo);

  useEffect(() => {
    let cancelled = false;
    async function loadRequests() {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: 'startTime',
        direction: sortDirection,
      });
      if (deferredSearch) params.set('search', deferredSearch);
      if (selectedRequestTypes.length)
        params.set('requestTypes', selectedRequestTypes.join(','));
      if (selectedSpecialties.length)
        params.set('especialidades', selectedSpecialties.join(','));
      if (selectedProperties.length)
        params.set('inmuebles', selectedProperties.join(','));
      if (selectedExternalStatuses.length)
        params.set('estadoExterno', selectedExternalStatuses.join(','));
      if (selectedGemaStatuses.length)
        params.set('estadoInterno', selectedGemaStatuses.join(','));
      if (dateRange.from) params.set('fechaDesde', dateRange.from);
      if (dateRange.to) params.set('fechaHasta', dateRange.to);
      try {
        const response = await fetchWithAuth(
          `/api/alexperto/solicitudes?${params}`,
        );
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
              : 'No se pudieron cargar las solicitudes.',
          );
        }
        const payload = (await response.json()) as AlexpertoRequestListResponse;
        if (cancelled) return;
        setRequests(payload.items);
        setTotal(payload.total);
        setPropertyOptions(current => {
          const options = new Map(
            current.map(option => [option.value, option]),
          );
          payload.items.forEach(item => {
            options.set(item.property.name, {
              value: item.property.name,
              label: item.property.name,
            });
          });
          return Array.from(options.values()).sort((a, b) =>
            a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }),
          );
        });
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Error al cargar solicitudes.',
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    pageSize,
    deferredSearch,
    selectedRequestTypes,
    selectedSpecialties,
    selectedProperties,
    selectedExternalStatuses,
    selectedGemaStatuses,
    datePreset,
    customDateFrom,
    customDateTo,
    sortDirection,
    dateRange.from,
    dateRange.to,
  ]);

  function changeFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function toggleSortDirection() {
    setSortDirection(current => (current === 'desc' ? 'asc' : 'desc'));
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  return (
    <main className="flex h-[calc(100vh-52px)] min-h-0 flex-col gap-2.5 overflow-hidden px-4 py-2.5 lg:px-6">
      <section className="shrink-0 space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
        <div className="flex items-center gap-2.5 px-0.5">
          <h2 className="m-0 text-sm font-bold tracking-tight text-slate-900">
            Solicitudes Alexperto
          </h2>
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {startItem} - {endItem} de {total}
          </span>
        </div>
        <div className="grid grid-cols-1 items-center gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          <SearchInput
            compact
            placeholder="Buscar código, inmueble o descripción..."
            value={search}
            onChange={value => changeFilter(setSearch, value)}
          />
          <SearchableMultiSelectField
            compact
            values={selectedRequestTypes}
            options={REQUEST_TYPE_OPTIONS}
            onChange={values => changeFilter(setSelectedRequestTypes, values)}
            placeholder="Tipo de solicitud"
            ariaLabel="Filtrar por tipo de solicitud"
          />
          <SearchableMultiSelectField
            compact
            values={selectedSpecialties}
            options={SPECIALTY_OPTIONS}
            onChange={values => changeFilter(setSelectedSpecialties, values)}
            placeholder="Especialidad (Todas)"
            ariaLabel="Filtrar por especialidad"
          />
          <SearchableMultiSelectField
            compact
            values={selectedProperties}
            options={propertyOptions}
            onChange={values => changeFilter(setSelectedProperties, values)}
            placeholder="Inmueble (Todos)"
            ariaLabel="Filtrar por inmueble"
          />
          <SearchableMultiSelectField
            compact
            values={selectedExternalStatuses}
            options={EXTERNAL_STATUS_OPTIONS}
            onChange={values =>
              changeFilter(setSelectedExternalStatuses, values)
            }
            placeholder="Estado Alexperto"
            ariaLabel="Filtrar por estado Alexperto"
          />
          <SearchableMultiSelectField
            compact
            values={selectedGemaStatuses}
            options={GEMA_STATUS_OPTIONS}
            onChange={values => changeFilter(setSelectedGemaStatuses, values)}
            placeholder="Gestión GEMA"
            ariaLabel="Filtrar por estado interno GEMA"
          />
          <div className="flex min-w-0 items-center gap-1.5">
            <select
              value={datePreset}
              onChange={event =>
                changeFilter(setDatePreset, event.target.value as DatePreset)
              }
              aria-label="Filtrar por fecha programada"
              className="h-8 w-[102px] shrink-0 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
              {DATE_PRESET_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {datePreset === 'CUSTOM' && (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <label className="sr-only" htmlFor="request-date-from">
                  Fecha programada desde
                </label>
                <input
                  id="request-date-from"
                  type="date"
                  value={customDateFrom}
                  onChange={event =>
                    changeFilter(setCustomDateFrom, event.target.value)
                  }
                  aria-label="Fecha programada desde"
                  className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1 text-[10px] text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <span className="text-[10px] font-semibold text-slate-400">
                  a
                </span>
                <label className="sr-only" htmlFor="request-date-to">
                  Fecha programada hasta
                </label>
                <input
                  id="request-date-to"
                  type="date"
                  value={customDateTo}
                  onChange={event =>
                    changeFilter(setCustomDateTo, event.target.value)
                  }
                  aria-label="Fecha programada hasta"
                  className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1 text-[10px] text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <AdminTableShell className="min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className={`${TABLE_CLASS} text-left text-xs`}>
            <thead>
              <tr>
                <th className={`${TH_CLASS} py-2.5`}>Código</th>
                <th className={`${TH_CLASS} py-2.5`}>
                  <button
                    type="button"
                    onClick={toggleSortDirection}
                    className="group inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:text-emerald-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    title={`Ordenar por fecha (${sortDirection === 'desc' ? 'Más recientes primero' : 'Más antiguas primero'})`}>
                    <span>Fecha programada</span>
                    <span className="flex items-center text-slate-400 transition group-hover:text-emerald-700">
                      {sortDirection === 'desc' ? (
                        <ChevronDown size={13} className="text-emerald-700" />
                      ) : (
                        <ChevronUp size={13} className="text-emerald-700" />
                      )}
                    </span>
                  </button>
                </th>
                <th className={`${TH_CLASS} min-w-[190px] py-2.5`}>Inmueble</th>
                <th className={`${TH_CLASS} py-2.5 text-center`}>
                  Archivos adjuntos
                </th>
                <th className={`${TH_CLASS} py-2.5 text-center`}>Tipo</th>
                <th className={`${TH_CLASS} py-2.5 text-center`}>
                  Estado Alexperto
                </th>
                <th className={`${TH_CLASS} py-2.5 text-center`}>
                  Gestión GEMA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500">
                    Consultando Alexperto...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-red-700">
                    {error}
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500">
                    No hay solicitudes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                requests.map(item => (
                  <tr
                    key={item.externalRequestId}
                    tabIndex={0}
                    onClick={() => setSelectedRequest(item)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedRequest(item);
                      }
                    }}
                    aria-label={`Ver detalle de solicitud ${item.code}`}
                    className="cursor-pointer transition hover:bg-slate-50/60 focus:outline-none focus-visible:bg-emerald-50">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-800">
                        {item.code}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {new Date(
                        item.startTime ?? item.createdAt,
                      ).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {item.property.name}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                          item.attachmentCount > 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-100 text-slate-500'
                        }`}>
                        <Paperclip size={12} />
                        {item.attachmentCount}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                        {formatRequestType(item.requestType)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        {formatExternalStatus(item.externalStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {internalStatusBadge(item.internalStatus)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            Mostrando{' '}
            <strong className="text-slate-800">
              {startItem} - {endItem}
            </strong>{' '}
            de <strong className="text-slate-800">{total}</strong>
            <select
              value={pageSize}
              onChange={event => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>
                  {size} / pág
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(current => Math.max(1, current - 1))}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft size={13} />
              Anterior
            </button>
            <span className="px-2 font-semibold text-slate-700">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() =>
                setPage(current => Math.min(totalPages, current + 1))
              }
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 disabled:cursor-not-allowed disabled:opacity-40">
              Siguiente
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </AdminTableShell>
      <RequestDetailDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </main>
  );
}

export default function SolicitudesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center text-sm font-medium text-slate-500">
          Cargando solicitudes de Alexperto...
        </div>
      }>
      <SolicitudesContent />
    </Suspense>
  );
}
