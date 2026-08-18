'use client';

import { Suspense, useDeferredValue, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

import { AdminTableShell } from '@/components/admin/admin-table-shell';
import { formatExternalStatus } from '@/components/admin/alexperto/quote-formatters';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import { fetchWithAuth } from '@/services/auth/auth.service';
import type {
  AlexpertoRequestListItem,
  AlexpertoRequestListResponse,
} from '@/types/alexperto';

const PAGE_SIZE_OPTIONS = [30, 50, 100];

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
  const [requestType, setRequestType] = useState('');
  const [externalStatus, setExternalStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;
    async function loadRequests() {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort: 'startTime',
        direction: 'desc',
      });
      if (deferredSearch) params.set('search', deferredSearch);
      if (requestType) params.set('requestTypes', requestType);
      if (externalStatus) params.set('estadoExterno', externalStatus);
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
  }, [page, pageSize, deferredSearch, requestType, externalStatus]);

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
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
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <SearchInput
            compact
            placeholder="Buscar código, inmueble o descripción..."
            value={search}
            onChange={value => changeFilter(setSearch, value)}
          />
          <SelectField
            value={requestType}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'CORRECTIVE', label: 'Correctivo' },
              { value: 'REQUIREMENT', label: 'Requerimiento' },
            ]}
            onChange={value => changeFilter(setRequestType, value)}
            ariaLabel="Filtrar por tipo de solicitud"
          />
          <SelectField
            value={externalStatus}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'PENDING', label: 'Pendiente' },
              { value: 'IN_PROGRESS', label: 'En proceso' },
              { value: 'COMPLETED', label: 'Culminado' },
            ]}
            onChange={value => changeFilter(setExternalStatus, value)}
            ariaLabel="Filtrar por estado Alexperto"
          />
        </div>
      </section>

      <AdminTableShell className="min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Inicio</th>
                <th className="min-w-[190px] px-4 py-2.5">Inmueble</th>
                <th className="min-w-[200px] px-4 py-2.5">Solicitud</th>
                <th className="px-4 py-2.5 text-center">Cotizaciones</th>
                <th className="px-4 py-2.5 text-center">Estado Alexperto</th>
                <th className="px-4 py-2.5 text-center">Gestión GEMA</th>
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
                    className="transition hover:bg-slate-50/60">
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
                    <td className="px-4 py-2.5">
                      <p className="m-0 font-semibold text-slate-900">
                        {item.specialty?.name ??
                          item.requestType ??
                          'Sin clasificar'}
                      </p>
                      <p className="m-0 mt-0.5 max-w-[360px] truncate text-[11px] font-normal text-slate-500">
                        {item.description ?? 'Sin descripción'}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold">
                      {item.quoteCount}
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
