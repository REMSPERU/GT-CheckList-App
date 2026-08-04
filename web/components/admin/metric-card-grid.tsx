import type { AdminMetric } from '@/types/admin';
import { Card } from '../ui/card';

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
              className="min-h-[140px] animate-pulse rounded-2xl border border-surface-border bg-surface/60 p-[18px]"
              key={index}
            />
          ))
        : metrics.map(metric => (
            <Card
              className="grid min-h-[140px] content-between p-[18px] bg-surface/90 shadow-[0_12px_30px_rgba(8,47,42,0.06)] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(8,47,42,0.12)] border border-surface-border"
              key={metric.label}>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {metric.label}
              </span>
              <strong className="text-[2.4rem] font-black tracking-[-0.07em] text-primary">
                {metric.value.toLocaleString('en-US')}
              </strong>
              <small className="text-xs font-semibold text-text-muted">{metric.note}</small>
            </Card>
          ))}
    </section>
  );
}

