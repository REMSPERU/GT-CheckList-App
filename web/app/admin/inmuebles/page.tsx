'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  listAdminProperties,
  type AdminPropertyRow,
} from '@/lib/admin-queries';
import { getSupabaseClient } from '@/lib/supabase-browser';

function normalize(value: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function AdminPropertiesPage() {
  const [items, setItems] = useState<AdminPropertyRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProperties() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminProperties(supabase);
        if (isMounted) setItems(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los inmuebles',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = normalize(search);
    if (!query) return items;

    return items.filter(item =>
      [item.code, item.name, item.address, item.city].some(value =>
        normalize(value).includes(query),
      ),
    );
  }, [items, search]);

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <section className="rounded-3xl border border-slate-900/10 bg-white/80 p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div>
          <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Sedes
          </span>
          <h2 className="m-0 text-[clamp(2rem,4vw,4.2rem)] font-bold tracking-[-0.04em] text-[#0c1720]">
            Inmuebles
          </h2>
          <p className="max-w-[680px] text-base text-slate-500">
            Vista de inmuebles registrados y su prioridad de mantenimiento.
          </p>
        </div>
      </section>

      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <input
          className="m-0 max-w-[520px] rounded-[10px] border border-slate-300 bg-white/90 px-3 py-2.5 text-base outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-300"
          type="search"
          placeholder="Buscar nombre, codigo, ciudad o direccion"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </section>

      {errorMessage ? (
        <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[0.95rem] text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-slate-900/10 bg-white/80 shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div className="border-b border-slate-300 px-[18px] py-4 font-bold text-slate-500">
          {isLoading
            ? 'Cargando inmuebles...'
            : `${filteredItems.length} inmuebles`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                {['Codigo', 'Nombre', 'Ciudad', 'Direccion', 'Prioridad', 'Activo'].map(
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
                  {[item.code ?? '-', item.name, item.city ?? '-', item.address ?? '-', item.maintenance_priority ?? '-', item.is_active ? 'Si' : 'No'].map((value, index) => (
                    <td
                      className="border-b border-slate-100 px-[18px] py-3.5 text-left align-top text-[0.92rem] text-[#0c1720]"
                      key={`${item.id}-${index}`}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
