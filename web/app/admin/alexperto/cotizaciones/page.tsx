'use client';

import { Suspense, useDeferredValue, useEffect, useState } from 'react';

import { SearchInput } from '@/components/ui/search-input';
import { SearchableMultiSelectField } from '@/components/ui/searchable-multi-select-field';
import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { TABLE_CLASS, TH_CLASS } from '@/components/admin/table-primitives';
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

const PAGE_SIZE_OPTIONS = [30, 50, 100];

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
  const [pageSize, setPageSize] = useState(30);
  const [sortBy, setSortBy] = useState<'createdAt' | 'amount' | 'delayDays'>(
    'createdAt',
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState<string>('3000'); // Default 3000 editable
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);
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
  const [auditorOptions, setAuditorOptions] = useState<FilterOption[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<FilterOption[]>([]);
  const [specialtyOptions, setSpecialtyOptions] = useState<FilterOption[]>([]);
  const [externalStatusOptions, setExternalStatusOptions] = useState<
    FilterOption[]
  >([]);

  const [selectedQuote, setSelectedQuote] =
    useState<AlexpertoQuoteAuditItem | null>(null);
  const [dateDisplay, setDateDisplay] = useState<'date' | 'delay'>('date');
  const deferredSearch = useDeferredValue(search);

  // Load quotes with server-side pagination and sorting
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
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
      if (selectedAuditors.length > 0) {
        params.set('auditores', selectedAuditors.join(','));
      }
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
          { signal: controller.signal },
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
        if (payload.auditors) {
          setAuditorOptions(current =>
            mergeFilterOptions(current, payload.auditors || []),
          );
        }
        setPropertyOptions(current =>
          mergeFilterOptions(
            current,
            payload.items.map(item => ({
              value: item.property.name,
              label: item.property.name,
            })),
          ),
        );
        setSpecialtyOptions(current =>
          mergeFilterOptions(current, payload.specialties),
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
            delayDays: item.delayDays,
            provider: item.providerName,
            creationUserType: item.creationUserType,
            requester: item.serviceCode ? `Sol. ${item.serviceCode}` : null,
            description: item.service,
            serviceCode: item.serviceCode,
            auditorComment: item.auditorComment,
            paulComment: item.paulComment,
            history: item.history,
            notes: item.notes ?? [],
            responsibleAuditors: item.responsibleAuditors,
            auditorDispatchStatus: item.auditorDispatchStatus,
          })),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
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
      controller.abort();
    };
  }, [
    page,
    pageSize,
    sortBy,
    sortDirection,
    minAmount,
    selectedAuditors,
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

  const handleDispatchUpdate = async (
    quoteId: string,
    dispatchStatus: 'ENVIADO' | 'RETIRADO',
  ) => {
    const response = await fetchWithAuth(
      `/api/alexperto/cotizaciones/${quoteId}/acciones`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatchStatus }),
      },
    );
    if (!response.ok) {
      throw new Error('No se pudo actualizar el despacho al auditor.');
    }
    const payload = (await response.json()) as {
      dispatchStatus: AlexpertoQuoteAuditItem['auditorDispatchStatus'];
    };
    const updateQuote = (quote: AlexpertoQuoteAuditItem) =>
      quote.id === quoteId
        ? { ...quote, auditorDispatchStatus: payload.dispatchStatus }
        : quote;
    setQuotes(previous => previous.map(updateQuote));
    setSelectedQuote(current => (current ? updateQuote(current) : current));
  };

  const handleSort = (column: 'createdAt' | 'amount' | 'delayDays') => {
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
      <section className="shrink-0 space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
        <div className="flex items-center gap-2.5 px-0.5">
          <h2 className="m-0 text-sm font-bold tracking-tight text-slate-900">
            Cotizaciones Alexperto
          </h2>
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {startItem} - {endItem} de {total}
          </span>
        </div>

        <div className="grid grid-cols-1 items-center gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <SearchInput
            placeholder="Buscar código, inmueble..."
            value={search}
            onChange={val => handleFilterChange(setSearch, val)}
            compact
          />

          <div className="relative flex w-full items-center">
            <span className="pointer-events-none absolute left-2.5 select-none text-xs font-bold text-slate-400">
              S/ &ge;
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={minAmount}
              onChange={e => handleFilterChange(setMinAmount, e.target.value)}
              placeholder="Monto mín."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-2 text-xs font-semibold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800/20"
              aria-label="Filtro de monto mínimo"
            />
          </div>

          <SearchableMultiSelectField
            values={selectedAuditors}
            options={auditorOptions}
            onChange={vals => handleFilterChange(setSelectedAuditors, vals)}
            placeholder="Auditor (Todos)"
            ariaLabel="Filtrar por auditor"
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
            values={selectedSpecialties}
            options={specialtyOptions}
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
              <tr>
                <th className={`${TH_CLASS} py-2.5`}>Código</th>
                <th className={`${TH_CLASS} py-2.5`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleSort(
                          dateDisplay === 'date' ? 'createdAt' : 'delayDays',
                        )
                      }
                      className="group inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:text-emerald-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      title={`Ordenar por ${dateDisplay === 'date' ? 'fecha' : 'días de retraso'}`}>
                      <span>
                        {dateDisplay === 'date' ? 'Fecha' : 'Retraso'}
                      </span>
                      <span className="flex items-center text-slate-400 transition group-hover:text-emerald-700">
                        {(dateDisplay === 'date' && sortBy === 'createdAt') ||
                        (dateDisplay === 'delay' && sortBy === 'delayDays') ? (
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
                    <span className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-[10px] normal-case tracking-normal shadow-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setDateDisplay('date');
                          handleSort('createdAt');
                        }}
                        className={`rounded px-1.5 py-0.5 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${dateDisplay === 'date' ? 'bg-emerald-900 text-white' : 'text-slate-500 hover:text-emerald-900'}`}>
                        Fecha
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDateDisplay('delay');
                          handleSort('delayDays');
                        }}
                        className={`rounded px-1.5 py-0.5 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${dateDisplay === 'delay' ? 'bg-emerald-900 text-white' : 'text-slate-500 hover:text-emerald-900'}`}>
                        Días
                      </button>
                    </span>
                  </div>
                </th>

                <th className={`${TH_CLASS} py-2.5 text-center`}>Creado por</th>
                <th className={`${TH_CLASS} min-w-[190px] py-2.5`}>Inmueble</th>
                <th className={`${TH_CLASS} min-w-[170px] py-2.5`}>
                  Especialidad
                </th>
                <th className={`${TH_CLASS} min-w-[160px] py-2.5`}>
                  Proveedor
                </th>
                <th className={`${TH_CLASS} py-2.5 text-right`}>
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="group ml-auto inline-flex cursor-pointer items-center justify-end gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:text-emerald-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    title={`Ordenar por monto (${sortBy === 'amount' && sortDirection === 'desc' ? 'Mayor a menor' : 'Menor a mayor'})`}>
                    <span>Monto</span>
                    <span className="flex items-center text-slate-400 transition group-hover:text-emerald-700">
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
                {user?.role === 'SUPERADMIN' && (
                  <th
                    className={`${TH_CLASS} min-w-[180px] py-2.5 text-center`}>
                    Auditores responsables
                  </th>
                )}
                {user?.role !== 'SUPERADMIN' && (
                  <th className={`${TH_CLASS} py-2.5 text-right`} scope="col">
                    Acciones
                  </th>
                )}
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
                filteredQuotes.map(item => {
                  const isObserved = item.gemaStatus === 'OBSERVADO';
                  const rowClass = isObserved
                    ? 'bg-amber-50/90 shadow-[inset_0_1px_0_rgb(253_230_138),inset_0_-1px_0_rgb(253_230_138)] hover:bg-amber-100/80'
                    : 'hover:bg-slate-50/80';
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedQuote(item)}
                      tabIndex={0}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedQuote(item);
                        }
                      }}
                      aria-label={`Ver detalle de cotización ${item.code}`}
                      className={`cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:bg-emerald-50 ${rowClass}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                        <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.code}
                        </span>
                      </td>

                      {/* FECHA / RETRASO */}
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                        {dateDisplay === 'date' ? (
                          new Date(item.createdAt).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        ) : (
                          <span
                            className={
                              item.delayDays > 0
                                ? 'font-bold text-amber-700'
                                : 'text-slate-500'
                            }>
                            {item.delayDays}{' '}
                            {item.delayDays === 1 ? 'día' : 'días'}
                          </span>
                        )}
                      </td>

                      {/* CREADO POR / ORIGEN */}
                      <td className="whitespace-nowrap px-4 py-2.5 text-center">
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

                      <td className="max-w-[280px] min-w-[190px] px-4 py-2.5">
                        <p
                          className="m-0 truncate font-semibold text-slate-900"
                          title={item.propertyName}>
                          {item.propertyName}
                        </p>
                      </td>

                      <td className="max-w-[240px] min-w-[170px] px-4 py-2.5">
                        <p
                          className="m-0 truncate font-semibold text-slate-800"
                          title={item.specialty}>
                          {item.specialty}
                        </p>
                      </td>

                      <td className="max-w-[220px] min-w-[160px] px-4 py-2.5">
                        {item.provider ? (
                          <p
                            className="m-0 truncate font-semibold text-slate-900"
                            title={item.provider}>
                            {item.provider}
                          </p>
                        ) : (
                          <span className="text-slate-400 font-normal italic">
                            Sin asignar
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                        S/{' '}
                        {item.amount
                          ? Number(item.amount).toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                            })
                          : '0.00'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-center">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                          {formatExternalStatus(item.externalStatus)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-center">
                        {getGemaBadge(item.gemaStatus)}
                      </td>
                      {user?.role === 'SUPERADMIN' && (
                        <td className="max-w-[260px] px-4 py-2.5 text-center">
                          {item.responsibleAuditors.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {item.responsibleAuditors.map(auditor => (
                                <span
                                  key={auditor.id}
                                  className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                  {auditor.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Sin asignar</span>
                          )}
                        </td>
                      )}

                      {user?.role !== 'SUPERADMIN' && (
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedQuote(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                            <span>Abrir</span>
                            <ChevronRight
                              size={14}
                              className="text-emerald-700"
                            />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
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
        onDispatchUpdate={handleDispatchUpdate}
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
