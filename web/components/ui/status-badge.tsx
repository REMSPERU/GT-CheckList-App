import type { ReactNode } from 'react';

export type StatusVariant =
  | 'active'
  | 'inactive'
  | 'in_progress'
  | 'pending'
  | 'completed'
  | 'cancelled';

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  showDot?: boolean;
  className?: string;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<
  StatusVariant,
  {
    container: string;
    dot: string;
    defaultLabel: string;
  }
> = {
  active: {
    container:
      'bg-emerald-50/80 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    defaultLabel: 'Activo',
  },
  inactive: {
    container:
      'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    defaultLabel: 'Inactivo',
  },
  in_progress: {
    container:
      'bg-amber-50/80 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    defaultLabel: 'En progreso',
  },
  pending: {
    container:
      'bg-sky-50/80 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    defaultLabel: 'Pendiente',
  },
  completed: {
    container:
      'bg-emerald-50/80 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
    defaultLabel: 'Finalizado',
  },
  cancelled: {
    container:
      'bg-rose-50/80 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    defaultLabel: 'Cancelado',
  },
};

export function StatusBadge({
  variant,
  label,
  showDot = true,
  className = '',
  children,
}: StatusBadgeProps) {
  const style = VARIANT_STYLES[variant] ?? VARIANT_STYLES.inactive;
  const displayLabel = label ?? children ?? style.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors ${style.container} ${className}`}>
      {showDot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
