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
    <main className="admin-content">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Sedes</span>
          <h2>Inmuebles</h2>
          <p>Vista de inmuebles registrados y su prioridad de mantenimiento.</p>
        </div>
      </section>

      <section className="table-toolbar">
        <input
          type="search"
          placeholder="Buscar nombre, codigo, ciudad o direccion"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </section>

      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}

      <section className="table-card">
        <div className="table-meta">
          {isLoading
            ? 'Cargando inmuebles...'
            : `${filteredItems.length} inmuebles`}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Ciudad</th>
                <th>Direccion</th>
                <th>Prioridad</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td>{item.code ?? '-'}</td>
                  <td>{item.name}</td>
                  <td>{item.city ?? '-'}</td>
                  <td>{item.address ?? '-'}</td>
                  <td>{item.maintenance_priority ?? '-'}</td>
                  <td>{item.is_active ? 'Si' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
