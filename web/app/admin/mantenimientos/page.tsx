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
    <main className="admin-content">
      <section className="section-heading">
        <div>
          <span className="eyebrow">Operacion</span>
          <h2>Mantenimientos</h2>
          <p>Revision administrativa de mantenimientos programados y cerrados.</p>
        </div>
      </section>

      <section className="table-toolbar">
        <input
          type="search"
          placeholder="Buscar codigo, inmueble, equipo o tipo"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="TODOS">Todos los estados</option>
          <option value="NO_INICIADO">No iniciado</option>
          <option value="EN_PROGRESO">En progreso</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="FINALIZADO">Finalizado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </section>

      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}

      <section className="table-card">
        <div className="table-meta">
          {isLoading
            ? 'Cargando mantenimientos...'
            : `${filteredItems.length} mantenimientos`}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Inmueble</th>
                <th>Equipo</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id}>
                  <td>{item.codigo ?? '-'}</td>
                  <td>{item.propertyName}</td>
                  <td>
                    <strong>{item.equipmentCode ?? '-'}</strong>
                    <small>{item.equipmentType}</small>
                  </td>
                  <td>{formatDate(item.dia_programado)}</td>
                  <td>{item.tipo_mantenimiento ?? '-'}</td>
                  <td>
                    <span className="status-pill">{item.estatus ?? '-'}</span>
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
