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
    <main className="admin-content">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Inventario</span>
          <h2>Equipos</h2>
          <p>Consulta todos los equipos con paginacion y filtro por estado.</p>
        </div>
      </section>

      <section className="table-toolbar">
        <input
          type="search"
          placeholder="Buscar codigo o ubicacion"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <select
          value={status}
          onChange={event => handleStatusChange(event.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </section>

      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}

      <section className="table-card">
        <div className="table-meta">
          {isLoading
            ? 'Cargando equipos...'
            : `${items.length} de ${total} equipos · pagina ${page} de ${totalPages}`}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Inmueble</th>
                <th>Tipo</th>
                <th>Ubicacion</th>
                <th>Estado</th>
                <th>Config</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.codigo ?? '-'}</td>
                  <td>
                    <strong>{item.propertyName}</strong>
                    <small>{item.propertyCity ?? item.propertyCode ?? '-'}</small>
                  </td>
                  <td>{item.equipmentName}</td>
                  <td>
                    <strong>{item.ubicacion ?? '-'}</strong>
                    <small>{item.detalle_ubicacion ?? ''}</small>
                  </td>
                  <td>
                    <span className="status-pill">{item.estatus ?? '-'}</span>
                  </td>
                  <td>{item.config ? 'Si' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage(current => Math.max(1, current - 1))}>
            Anterior
          </button>
          <span>
            Pagina {page} de {totalPages}
          </span>
          <button
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
