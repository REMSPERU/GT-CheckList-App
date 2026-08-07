import type { AdminMetric } from '@/types/admin';

interface MetricCardGridProps {
  metrics: AdminMetric[];
  isLoading: boolean;
}

export function MetricCardGrid({ metrics, isLoading }: MetricCardGridProps) {
  return (
    <section
      className="grid grid-cols-5 gap-4 lg:gap-5 max-[1200px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1"
      aria-label="Métricas administrativas"
      aria-busy={isLoading}>
      {isLoading
        ? Array.from({ length: 5 }).map((_, index) => (
            <div
              className="min-h-[140px] animate-pulse rounded-xl border border-slate-200 bg-white/70 p-5 lg:p-6 shadow-xs"
              key={index}
              role="status"
              aria-label="Cargando métrica..."
            />
          ))
        : metrics.map((metric, index) => {
            const accentColors = [
              'border-t-[#072e27] text-slate-900',
              'border-t-emerald-600 text-emerald-950',
              'border-t-amber-600 text-amber-950',
              'border-t-teal-600 text-teal-950',
              'border-t-slate-700 text-slate-900',
            ];
            const accentClass = accentColors[index % accentColors.length];

            return (
              <article
                className={`grid min-h-[140px] content-between rounded-xl border border-slate-200 border-t-4 bg-white p-5 lg:p-6 shadow-xs transition-all duration-150 hover:border-slate-300 hover:shadow-md group ${accentClass}`}
                key={metric.label}>
                <span className="text-[0.72rem] font-bold text-slate-600 uppercase tracking-wider">{metric.label}</span>
                <strong className="text-3xl font-extrabold tracking-tight my-1.5 leading-none">
                  {typeof metric.value === 'number'
                    ? metric.value.toLocaleString('es-PE')
                    : metric.value}
                </strong>
                <small className="text-[0.75rem] font-medium text-slate-500">{metric.note}</small>
              </article>
            );
          })}
    </section>
  );
}

