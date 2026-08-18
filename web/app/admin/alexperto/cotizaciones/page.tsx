'use client';

import {
  Suspense,
  useDeferredValue,
  useEffect,
  useState,
} from 'react';

import { SearchInput } from '@/components/ui/search-input';
import { SearchableMultiSelectField } from '@/components/ui/searchable-multi-select-field';
import { AdminTableShell } from '@/components/admin/admin-table-shell';
import {
  TABLE_CLASS,
  TD_CLASS,
  TH_CLASS,
} from '@/components/admin/table-primitives';
import { formatExternalStatus } from '@/components/admin/alexperto/quote-formatters';
import { QuoteWorkspaceDialog } from '@/components/admin/alexperto/quote-workspace-dialog';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

import { useAdminSession } from '@/hooks/auth/use-admin-session';
import { fetchWithAuth } from '@/services/auth/auth.service';
import type {
  AlexpertoQuoteAuditItem,
  AlexpertoQuoteListResponse,
} from '@/types/alexperto';

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

const CREATION_USER_OPTIONS = [
  { value: 'PROVIDER', label: 'Proveedor' },
  { value: 'ADMINISTRATOR', label: 'Administrador' },
];

const GEMA_STATUS_OPTIONS = [
  { value: 'PENDIENTE_REVISION', label: 'Pendiente de Revisión' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'CULMINADO', label: 'Culminado' },
  { value: 'VALIDADO', label: 'Marcado como revisado' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type FilterOption = { value: string; label: string };

function mergeFilterOptions(
  current: FilterOption[],
  incoming: FilterOption[],
): FilterOption[] {
  const options = new Map(current.map(option => [option.value, option]));
  incoming.forEach(option => options.set(option.value, option));
  return Array.from(options.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }),
  );
}

function CotizacionesContent() {
  const { user } = useAdminSession();
  const [quotes, setQuotes] = useState<AlexpertoQuoteAuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState<string>('3000'); // Default 3000 editable
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedExternalStatuses, setSelectedExternalStatuses] = useState<
    string[]
  >(['PENDING']);
  const [selectedGemaStatuses, setSelectedGemaStatuses] = useState<string[]>(
    [],
  );
  const [selectedCreationUserTypes, setSelectedCreationUserTypes] = useState<
    string[]
  >([]);
  const [propertyOptions, setPropertyOptions] = useState<FilterOption[]>([]);
  const [externalStatusOptions, setExternalStatusOptions] = useState<
    FilterOption[]
  >([]);

  const [selectedQuote, setSelectedQuote] =
    useState<AlexpertoQuoteAuditItem | null>(null);
  const deferredSearch = useDeferredValue(search);

  // Load quotes with server-side pagination and sorting
  useEffect(() => {
    let cancelled = false;
    async function loadQuotes() {
      setIsLoading(true);
      setLoadError(null);
      const parsedMinAmount =
        minAmount !== '' && !isNaN(Number(minAmount)) ? minAmount : '0';
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        montoMinimo: parsedMinAmount,
        sort: sortBy,
        direction: sortDirection,
      });
      if (selectedSpecialties.length > 0) {
        params.set('especialidades', selectedSpecialties.join(','));
      }
      if (selectedExternalStatuses.length > 0) {
        params.set('estadoExterno', selectedExternalStatuses.join(','));
      }
      if (selectedGemaStatuses.length > 0) {
        params.set('estadoInterno', selectedGemaStatuses.join(','));
      }
      if (selectedCreationUserTypes.length > 0) {
        params.set('creadoPor', selectedCreationUserTypes.join(','));
      }
      if (selectedProperties.length > 0) {
        params.set('inmuebles', selectedProperties.join(','));
      }
      if (deferredSearch) params.set('search', deferredSearch);

      try {
        const response = await fetchWithAuth(
          `/api/alexperto/cotizaciones?${params}`,
        );
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? 'Tu sesion expiro. Vuelve a iniciar sesion.'
              : 'No se pudieron cargar las cotizaciones.',
          );
        }
        const payload = (await response.json()) as AlexpertoQuoteListResponse;
        if (cancelled) return;
        setTotal(payload.total);
        setPropertyOptions(current =>
          mergeFilterOptions(
            current,
            payload.items.map(item => ({
              value: item.property.name,
              label: item.property.name,
            })),
          ),
        );
        setExternalStatusOptions(current =>
          mergeFilterOptions(
            current,
            payload.items
              .filter(item => Boolean(item.externalStatus))
              .map(item => ({
                value: item.externalStatus as string,
                label: formatExternalStatus(item.externalStatus as string),
              })),
          ),
        );
        setQuotes(
          payload.items.map(item => ({
            id: item.externalQuoteId,
            code: item.code,
            propertyName: item.property.name,
            specialty: item.specialty.name,
            subSpecialty: item.specialty.code,
            externalStatus: item.externalStatus ?? 'SIN ESTADO',
            gemaStatus: item.internalStatus,
            amount: item.amount,
            createdAt: item.createdAt,
            provider: item.providerName,
            creationUserType: item.creationUserType,
            requester: item.serviceCode ? `Sol. ${item.serviceCode}` : null,
            description: item.service,
            serviceCode: item.serviceCode,
            auditorComment: item.auditorComment,
            paulComment: item.paulComment,
            history: item.history,
          })),
        );
      } catch (error) {
        if (!cancelled)
          setLoadError(
            error instanceof Error ? error.message : 'Error al cargar datos.',
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadQuotes();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    pageSize,
    sortBy,
    sortDirection,
    minAmount,
    selectedSpecialties,
    selectedExternalStatuses,
    selectedGemaStatuses,
    selectedCreationUserTypes,
    selectedProperties,
    deferredSearch,
  ]);

  // Reset page to 1 when any filter changes
  const handleFilterChange = (setter: (val: any) => void, value: any) => {
    setter(value);
    setPage(1);
  };

  const handleSort = (column: 'createdAt' | 'amount') => {
    if (sortBy === column) {
      setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const filteredQuotes = quotes;

  const handleStatusUpdate = async (input: {
    quoteId: string;
    status: AlexpertoQuoteAuditItem['gemaStatus'];
    auditorComment: string | null;
    paulComment: string | null;
    recordHistory: boolean;
  }) => {
    const body: {
      status: AlexpertoQuoteAuditItem['gemaStatus'];
      auditorComment: string | null;
      paulComment?: string | null;
      recordHistory: boolean;
    } = {
      status: input.status,
      auditorComment: input.auditorComment,
      recordHistory: input.recordHistory,
    };
    if (user?.role === 'SUPERADMIN') body.paulComment = input.paulComment;

    const response = await fetchWithAuth(
      `/api/alexperto/cotizaciones/${input.quoteId}/acciones`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error('No se pudo guardar la revisión en GEMA.');
    }
    const payload = (await response.json()) as {
      historyEntry: AlexpertoQuoteAuditItem['history'][number] | null;
    };

    setQuotes(prev =>
      prev.map(quote =>
        quote.id === input.quoteId
          ? {
              ...quote,
              gemaStatus: input.status,
              auditorComment: input.auditorComment,
              paulComment:
                user?.role === 'SUPERADMIN'
                  ? input.paulComment
                  : quote.paulComment,
              history: payload.historyEntry
                ? [payload.historyEntry, ...quote.history]
                : quote.history,
            }
          : quote,
      ),
    );
    setSelectedQuote(current =>
      current?.id === input.quoteId
        ? {
            ...current,
            gemaStatus: input.status,
            auditorComment: input.auditorComment,
            paulComment:
              user?.role === 'SUPERADMIN'
                ? input.paulComment
                : current.paulComment,
            history: payload.historyEntry
              ? [payload.historyEntry, ...current.history]
              : current.history,
          }
        : current,
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  const getGemaBadge = (status: string) => {
    switch (status) {
      case 'CULMINADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Culminado
          </span>
        );
      case 'VALIDADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Revisado
          </span>
        );
      case 'OBSERVADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
            <AlertCircle size={12} className="text-amber-600" />
            Observado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
            <Clock size={12} className="text-slate-500" />
            Pendiente
          </span>
        );
    }
  };

  return (
    <main className="flex h-[calc(100vh-52px)] min-h-0 flex-col gap-2.5 overflow-hidden px-4 py-2.5 lg:px-6">
      {/* COMPACT & BALANCED HEADER & FILTERS BAR */}
      <section className="shrink-0 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="m-0 text-sm font-bold tracking-tight text-slate-900 leading-none">
              Cotizaciones Alexperto
            </h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
              {startItem} - {endItem} de {total}
            </span>
          </div>
        </div>

        {/* SEARCH & SEARCHABLE MULTI-SELECT FILTERS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2.5 items-center">
          <div className="w-full">
            <SearchInput
              placeholder="Buscar código, inmueble..."
              value={search}
              onChange={val => handleFilterChange(setSearch, val)}
              compact
            />
          </div>

          {/* EDITABLE MINIMUM AMOUNT FILTER (DEFAULT 3000) */}
          <div className="relative flex items-center w-full">
            <span className="absolute left-2.5 text-xs font-bold text-slate-400 select-none">
              S/ &ge;
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={minAmount}
              onChange={e => handleFilterChange(setMinAmount, e.target.value)}
              placeholder="Monto mín."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-2 text-xs font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800/20 placeholder:text-slate-400"
              aria-label="Filtro de monto mínimo"
            />
          </div>

          <SearchableMultiSelectField
            values={selectedSpecialties}
            options={SPECIALTY_OPTIONS}
            onChange={vals => handleFilterChange(setSelectedSpecialties, vals)}
            placeholder="Especialidad (Todas)"
            ariaLabel="Filtrar por especialidad"
            compact
          />

          <SearchableMultiSelectField
            values={selectedCreationUserTypes}
            options={CREATION_USER_OPTIONS}
            onChange={vals =>
              handleFilterChange(setSelectedCreationUserTypes, vals)
            }
            placeholder="Creado por (Todos)"
            ariaLabel="Filtrar por creador"
            compact
          />

          <SearchableMultiSelectField
            values={selectedProperties}
            options={propertyOptions}
            onChange={vals => handleFilterChange(setSelectedProperties, vals)}
            placeholder="Inmueble (Todos)"
            ariaLabel="Filtrar por inmueble"
            compact
          />

          <SearchableMultiSelectField
            values={selectedExternalStatuses}
            options={externalStatusOptions}
            onChange={vals =>
              handleFilterChange(setSelectedExternalStatuses, vals)
            }
            placeholder="Estado Alexperto"
            ariaLabel="Filtrar por estado Alexperto"
            compact
          />

          <SearchableMultiSelectField
            values={selectedGemaStatuses}
            options={GEMA_STATUS_OPTIONS}
            onChange={vals => handleFilterChange(setSelectedGemaStatuses, vals)}
            placeholder="Gestión GEMA"
            ariaLabel="Filtrar por estado interno GEMA"
            compact
          />

        </div>
      </section>

      {/* EXPANDED TABLE SHELL TAKING REMAINING HEIGHT */}
      <AdminTableShell className="flex-1 min-h-0">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className={TABLE_CLASS}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className={`${TH_CLASS} py-2.5`}>Código</th>

                {/* SORTABLE DATE COLUMN */}
                <th className={`${TH_CLASS} py-2.5`}>
                  <button
                    type="button"
                    onClick={() => handleSort('createdAt')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-950 uppercase tracking-wider transition group cursor-pointer"
                    title={`Ordenar por fecha (${sortBy === 'createdAt' && sortDirection === 'desc' ? 'Más recientes primero' : 'Más antiguas primero'})`}>
                    <span>Fecha</span>
                    <span className="flex items-center text-slate-400 group-hover:text-emerald-700 transition">
                      {sortBy === 'createdAt' ? (
                        sortDirection === 'desc' ? (
                          <ArrowDown size={13} className="text-emerald-700" />
                        ) : (
                          <ArrowUp size={13} className="text-emerald-700" />
                        )
                      ) : (
                        <ArrowUpDown
                          size={12}
                          className="opacity-40 group-hover:opacity-100"
                        />
                      )}
                    </span>
                  </button>
                </th>

                <th className={`${TH_CLASS} py-2.5 text-center`}>Creado por</th>
                <th className={`${TH_CLASS} py-2.5 min-w-[200px]`}>Inmueble</th>
                <th className={`${TH_CLASS} py-2.5 min-w-[170px]`}>
                  Especialidad
                </th>
                <th className={`${TH_CLASS} py-2.5 min-w-[160px]`}>
                  Proveedor
                </th>

                {/* SORTABLE AMOUNT COLUMN */}
                <th className={`${TH_CLASS} py-2.5 text-right`}>
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="inline-flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-950 uppercase tracking-wider transition group cursor-pointer ml-auto"
                    title={`Ordenar por monto (${sortBy === 'amount' && sortDirection === 'desc' ? 'Mayor a menor' : 'Menor a mayor'})`}>
                    <span>Monto</span>
                    <span className="flex items-center text-slate-400 group-hover:text-emerald-700 transition">
                      {sortBy === 'amount' ? (
                        sortDirection === 'desc' ? (
                          <ArrowDown size={13} className="text-emerald-700" />
                        ) : (
                          <ArrowUp size={13} className="text-emerald-700" />
                        )
                      ) : (
                        <ArrowUpDown
                          size={12}
                          className="opacity-40 group-hover:opacity-100"
                        />
                      )}
                    </span>
                  </button>
                </th>

                <th className={`${TH_CLASS} py-2.5 text-center`}>
                  Estado Alexperto
                </th>
                <th className={`${TH_CLASS} py-2.5 text-center`}>
                  Gestión GEMA
                </th>
                <th className={`${TH_CLASS} py-2.5 text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-slate-500">
                    Consultando Alexperto...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-red-700">
                    {loadError}
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-slate-500">
                    No hay cotizaciones para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedQuote(item)}
                    className="cursor-pointer transition hover:bg-slate-50/60">
                    <td
                      className={`${TD_CLASS} py-2.5 whitespace-nowrap font-bold`}>
                      <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.code}
                      </span>
                    </td>

                    {/* FECHA */}
                    <td
                      className={`${TD_CLASS} py-2.5 whitespace-nowrap text-slate-700 font-medium`}>
                      {new Date(item.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>

                    {/* CREADO POR / ORIGEN */}
                    <td
                      className={`${TD_CLASS} py-2.5 whitespace-nowrap text-center`}>
                      {item.creationUserType === 'ADMINISTRATOR' ? (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-800 border border-slate-200">
                          Administrador
                        </span>
                      ) : item.creationUserType === 'PROVIDER' ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                          Proveedor
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                          {item.creationUserType || 'Administrador'}
                        </span>
                      )}
                    </td>

                    {/* INMUEBLE - FULL TEXT WRAP */}
                    <td
                      className={`${TD_CLASS} py-2.5 min-w-[200px] max-w-[280px]`}>
                      <p className="font-semibold text-slate-900 m-0 leading-snug break-words">
                        {item.propertyName}
                      </p>
                    </td>

                    {/* ESPECIALIDAD */}
                    <td className={`${TD_CLASS} py-2.5 min-w-[170px]`}>
                      <p className="font-semibold text-slate-800 m-0 leading-snug break-words">
                        {item.specialty}
                      </p>
                      <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                        {item.subSpecialty}
                      </span>
                    </td>

                    {/* PROVEEDOR */}
                    <td className={`${TD_CLASS} py-2.5 min-w-[160px]`}>
                      {item.provider ? (
                        <p className="font-semibold text-slate-900 m-0 leading-snug break-words">
                          {item.provider}
                        </p>
                      ) : (
                        <span className="text-slate-400 font-normal italic">
                          Sin asignar
                        </span>
                      )}
                    </td>

                    {/* MONTO */}
                    <td
                      className={`${TD_CLASS} py-2.5 whitespace-nowrap text-right font-bold text-slate-900 font-mono`}>
                      S/{' '}
                      {item.amount
                        ? Number(item.amount).toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                          })
                        : '0.00'}
                    </td>

                    {/* ESTADO ALEXPERTO */}
                    <td className={`${TD_CLASS} py-2.5 text-center`}>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                        {formatExternalStatus(item.externalStatus)}
                      </span>
                    </td>

                    {/* GESTIÓN GEMA */}
                    <td className={`${TD_CLASS} py-2.5 text-center`}>
                      {getGemaBadge(item.gemaStatus)}
                    </td>

                    {/* ACCIONES */}
                    <td
                      className={`${TD_CLASS} py-2.5 whitespace-nowrap text-right`}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedQuote(item);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#072e27] hover:text-emerald-700 transition px-2 py-0.5 rounded-md hover:bg-emerald-50">
                        <span>Ver detalle</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER PAGINATION CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Mostrando{' '}
              <strong className="text-slate-800 font-bold">
                {startItem} - {endItem}
              </strong>{' '}
              de <strong className="text-slate-800 font-bold">{total}</strong>{' '}
              cotizaciones
            </span>

            {/* Page size selector */}
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[11px] text-slate-400">Ver:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-700">
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>
                    {size} / pág
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft size={13} />
              <span>Anterior</span>
            </button>

            <span className="px-2 font-semibold text-slate-700 text-xs">
              Página {page} de {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <span>Siguiente</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </AdminTableShell>

      <QuoteWorkspaceDialog
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        isSuperadmin={user?.role === 'SUPERADMIN'}
        onStatusUpdate={handleStatusUpdate}
      />
    </main>
  );
}

export default function CotizacionesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
          <p className="text-sm font-medium text-slate-500">
            Cargando cotizaciones de Alexperto...
          </p>
        </div>
      }>
      <CotizacionesContent />
    </Suspense>
  );
}
