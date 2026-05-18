'use client';

import { useEffect, useState } from 'react';

import { getAdminMetrics, type AdminMetric } from '@/lib/admin-queries';
import { getSupabaseClient } from '@/lib/supabase-browser';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      try {
        const supabase = getSupabaseClient();
        const result = await getAdminMetrics(supabase);
        if (isMounted) setMetrics(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'No se pudo cargar el panel',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="admin-content">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Resumen</span>
          <h2>Control general del inventario</h2>
          <p>
            Vista rapida para revisar el estado operativo antes de entrar a las
            tablas de equipos, inmuebles y mantenimientos.
          </p>
        </div>
      </section>

      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}

      <section className="metric-grid" aria-label="Metricas administrativas">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div className="metric-card skeleton" key={index} />
            ))
          : metrics.map(metric => (
              <article className="metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.note}</small>
              </article>
            ))}
      </section>
    </main>
  );
}
