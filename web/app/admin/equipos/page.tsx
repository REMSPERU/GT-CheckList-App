'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  listAdminEquipments,
  type AdminEquipmentRow,
} from '@/lib/admin-queries';
import { getSupabaseClient } from '@/lib/supabase-browser';

const PAGE_SIZE = 50;

export default function AdminEquipmentsPage() {
  const [items, setItems] = useState<AdminEquipmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipments() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await listAdminEquipments(supabase, {
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          status,
        });
        if (isMounted) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los equipos',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEquipments();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, page, status]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  function handleStatusChange(nextStatus: string) {
    setStatus(nextStatus);
    setPage(1);
  }

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <section className="rounded-3xl border border-slate-900/10 bg-white/80 p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div>
          <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Inventario
          </span>
          <h2 className="m-0 text-[clamp(2rem,4vw,4.2rem)] font-bold tracking-[-0.04em] text-[#0c1720]">
            Equipos
          </h2>
          <p className="max-w-[680px] text-base text-slate-500">
            Consulta todos los equipos con paginacion y filtro por estado.
          </p>
        </div>
      </section>

      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <input
          className="m-0 max-w-[520px] rounded-[10px] border border-slate-300 bg-white/90 px-3 py-2.5 text-base outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
          type="search"
          placeholder="Buscar codigo o ubicacion"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <select
          className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900"
          value={status}
          onChange={event => handleStatusChange(event.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </section>

      {errorMessage ? (
        <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[0.95rem] text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-slate-900/10 bg-white/80 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div className="border-b border-slate-300 px-[18px] py-4 font-bold text-slate-500">
          {isLoading
            ? 'Cargando equipos...'
            : `${items.length} de ${total} equipos · pagina ${page} de ${totalPages}`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {['Codigo', 'Inmueble', 'Tipo', 'Ubicacion', 'Estado', 'Config'].map(
                  header => (
                    <th
                      className="border-b border-slate-100 bg-slate-50 px-[18px] py-3.5 text-left align-top text-xs uppercase tracking-[0.08em] text-slate-500"
                      key={header}>
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {item.codigo ?? '-'}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <strong className="block">{item.propertyName}</strong>
                    <small className="mt-1 block text-slate-500">
                      {item.propertyCity ?? item.propertyCode ?? '-'}
                    </small>
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {item.equipmentName}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <strong className="block">{item.ubicacion ?? '-'}</strong>
                    <small className="mt-1 block text-slate-500">
                      {item.detalle_ubicacion ?? ''}
                    </small>
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <span className="inline-flex min-h-7 items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-900">
                      {item.estatus ?? '-'}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {item.config ? 'Si' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-300 px-[18px] py-3.5 font-bold text-slate-500 max-[640px]:flex-col max-[640px]:items-stretch">
          <button
            className="m-0 h-[38px] w-auto rounded-[10px] border-0 bg-emerald-800 px-3.5 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage(current => Math.max(1, current - 1))}>
            Anterior
          </button>
          <span>
            Pagina {page} de {totalPages}
          </span>
          <button
            className="m-0 h-[38px] w-auto rounded-[10px] border-0 bg-emerald-800 px-3.5 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}>
            Siguiente
          </button>
        </div>
      </section>
    </main>
  );
}
