import type { AdminMetric } from '@/types/admin';

interface MetricCardGridProps {
  metrics: AdminMetric[];
  isLoading: boolean;
}

export function MetricCardGrid({ metrics, isLoading }: MetricCardGridProps) {
  return (
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
                {metric.value.toLocaleString('en-US')}
              </strong>
              <small className="text-slate-500">{metric.note}</small>
            </article>
          ))}
    </section>
  );
}
