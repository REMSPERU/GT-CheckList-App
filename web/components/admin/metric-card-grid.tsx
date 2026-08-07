import type { AdminMetric } from '@/types/admin';

interface MetricCardGridProps {
  metrics: AdminMetric[];
  isLoading: boolean;
}

export function MetricCardGrid({ metrics, isLoading }: MetricCardGridProps) {
  return (
    <section
      className="grid grid-cols-5 gap-3.5 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1"
      aria-label="Métricas administrativas"
      aria-busy={isLoading}>
      {isLoading
        ? Array.from({ length: 5 }).map((_, index) => (
            <div
              className="min-h-[150px] animate-pulse rounded-[20px] border border-slate-900/10 bg-white/80 p-[18px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]"
              key={index}
              role="status"
              aria-label="Cargando métrica..."
            />
          ))
        : metrics.map(metric => (
            <article
              className="grid min-h-[150px] content-between rounded-[20px] border border-slate-900/10 bg-white/85 p-[18px] backdrop-blur-sm shadow-[0_16px_48px_rgba(12,23,32,0.06)] transition-all hover:shadow-[0_20px_60px_rgba(12,23,32,0.1)]"
              key={metric.label}>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{metric.label}</span>
              <strong className="text-[2.6rem] font-black tracking-[-0.05em] text-[#0c1720]">
                {typeof metric.value === 'number'
                  ? metric.value.toLocaleString('es-PE')
                  : metric.value}
              </strong>
              <small className="text-xs font-medium text-slate-500">{metric.note}</small>
            </article>
          ))}
    </section>
  );
}
