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
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <section className="flex min-h-[190px] items-end rounded-3xl border border-slate-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(217,249,157,0.42)),radial-gradient(circle_at_78%_20%,rgba(8,145,178,0.24),transparent_30%)] p-[26px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <div>
          <span className="mb-1.5 inline-block text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Resumen
          </span>
          <h2 className="m-0 text-[clamp(2rem,4vw,4.2rem)] font-bold tracking-[-0.04em] text-[#0c1720]">
            Control general del inventario
          </h2>
          <p className="max-w-[680px] text-base text-slate-500">
            Vista rapida para revisar el estado operativo antes de entrar a las
            tablas de equipos, inmuebles y mantenimientos.
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-[0.95rem] text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section
        className="grid grid-cols-5 gap-3.5 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1"
        aria-label="Metricas administrativas">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                className="min-h-[150px] animate-pulse rounded-[20px] border border-slate-900/10 bg-white/80 p-[18px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]"
                key={index}
              />
            ))
          : metrics.map(metric => (
              <article
                className="grid min-h-[150px] content-between rounded-[20px] border border-slate-900/10 bg-white/80 p-[18px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]"
                key={metric.label}>
                <span className="text-slate-500">{metric.label}</span>
                <strong className="text-[2.6rem] font-bold tracking-[-0.07em] text-[#0c1720]">
                  {metric.value}
                </strong>
                <small className="text-slate-500">{metric.note}</small>
              </article>
            ))}
      </section>
    </main>
  );
}
