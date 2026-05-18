'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  listAdminMaintenances,
  type AdminMaintenanceRow,
} from '@/lib/admin-queries';
import { getSupabaseClient } from '@/lib/supabase-browser';

function normalize(value: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-PE');
}

export default function AdminMaintenancesPage() {
  const [items, setItems] = useState<AdminMaintenanceRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMaintenances() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminMaintenances(supabase);
        if (isMounted) setItems(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los mantenimientos',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMaintenances();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = normalize(search);

    return items.filter(item => {
      const matchesStatus = status === 'TODOS' || item.estatus === status;
      const matchesSearch =
        !query ||
        [
          item.codigo,
          item.propertyName,
          item.equipmentCode,
          item.equipmentType,
          item.tipo_mantenimiento,
        ].some(value => normalize(value).includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [items, search, status]);

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <section className="rounded-3xl border border-slate-900/10 bg-white/80 p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div>
          <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Operacion
          </span>
          <h2 className="m-0 text-[clamp(2rem,4vw,4.2rem)] font-bold tracking-[-0.04em] text-[#0c1720]">
            Mantenimientos
          </h2>
          <p className="max-w-[680px] text-base text-slate-500">
            Revision administrativa de mantenimientos programados y cerrados.
          </p>
        </div>
      </section>

      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <input
          className="m-0 max-w-[520px] rounded-[10px] border border-slate-300 bg-white/90 px-3 py-2.5 text-base outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
          type="search"
          placeholder="Buscar codigo, inmueble, equipo o tipo"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <select
          className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-slate-900"
          value={status}
          onChange={event => setStatus(event.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="NO_INICIADO">No iniciado</option>
          <option value="EN_PROGRESO">En progreso</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="FINALIZADO">Finalizado</option>
          <option value="CANCELADO">Cancelado</option>
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
            ? 'Cargando mantenimientos...'
            : `${filteredItems.length} mantenimientos`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {['Codigo', 'Inmueble', 'Equipo', 'Fecha', 'Tipo', 'Estado'].map(
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
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {item.codigo ?? '-'}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {item.propertyName}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <strong className="block">{item.equipmentCode ?? '-'}</strong>
                    <small className="mt-1 block text-slate-500">
                      {item.equipmentType}
                    </small>
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {formatDate(item.dia_programado)}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    {item.tipo_mantenimiento ?? '-'}
                  </td>
                  <td className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]">
                    <span className="inline-flex min-h-7 items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-900">
                      {item.estatus ?? '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
