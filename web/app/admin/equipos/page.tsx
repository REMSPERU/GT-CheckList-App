'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  listAdminEquipments,
  type AdminEquipmentRow,
} from '@/lib/admin-queries';
import { getSupabaseClient } from '@/lib/supabase-browser';

function normalize(value: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function AdminEquipmentsPage() {
  const [items, setItems] = useState<AdminEquipmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipments() {
      try {
        const supabase = getSupabaseClient();
        const result = await listAdminEquipments(supabase);
        if (isMounted) setItems(result);
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
  }, []);

  const filteredItems = useMemo(() => {
    const query = normalize(search);

    return items.filter(item => {
      const matchesStatus = status === 'TODOS' || item.estatus === status;
      const matchesSearch =
        !query ||
        [
          item.codigo,
          item.ubicacion,
          item.detalle_ubicacion,
          item.propertyName,
          item.propertyCode,
          item.equipmentName,
        ].some(value => normalize(value).includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [items, search, status]);

  return (
    <main className="admin-content">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Inventario</span>
          <h2>Equipos</h2>
          <p>Consulta equipos por inmueble, tipo, estado, codigo o ubicacion.</p>
        </div>
      </section>

      <section className="table-toolbar">
        <input
          type="search"
          placeholder="Buscar codigo, inmueble o ubicacion"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </section>

      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}

      <section className="table-card">
        <div className="table-meta">
          {isLoading ? 'Cargando equipos...' : `${filteredItems.length} equipos`}
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
              {filteredItems.map(item => (
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
      </section>
    </main>
  );
}
