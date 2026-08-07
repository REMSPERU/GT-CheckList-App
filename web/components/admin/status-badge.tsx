interface StatusBadgeProps {
  children: string | null;
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

function getVariant(status: string | null): BadgeVariant {
  if (!status) return 'neutral';
  const normalized = status.toUpperCase();

  if (
    normalized.includes('ACTIVO') ||
    normalized.includes('COMPLETADO') ||
    normalized.includes('APROBADO') ||
    normalized.includes('FINALIZADO') ||
    normalized.includes('OK')
  ) {
    return 'success';
  }
  if (
    normalized.includes('PENDIENTE') ||
    normalized.includes('EN_PROGRESO') ||
    normalized.includes('EN PROGRESO') ||
    normalized.includes('EN_REVISION') ||
    normalized.includes('PROGRAMADO')
  ) {
    return 'warning';
  }
  if (
    normalized.includes('RECHAZADO') ||
    normalized.includes('ERROR') ||
    normalized.includes('FALLO') ||
    normalized.includes('INACTIVO') ||
    normalized.includes('CANCELADO')
  ) {
    return 'danger';
  }
  if (normalized.includes('DRAFT') || normalized.includes('BORRADOR')) {
    return 'info';
  }
  return 'neutral';
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success:
    'bg-emerald-50 text-emerald-900 ring-emerald-600/20',
  warning:
    'bg-amber-50 text-amber-900 ring-amber-500/20',
  danger:
    'bg-rose-50 text-rose-900 ring-rose-500/20',
  info:
    'bg-sky-50 text-sky-900 ring-sky-500/20',
  neutral:
    'bg-slate-100 text-slate-700 ring-slate-200',
};

export function StatusBadge({ children }: StatusBadgeProps) {
  const variant = getVariant(children);
  const classes = VARIANT_CLASSES[variant];

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ring-inset ${classes}`}>
      {children ?? '-'}
    </span>
  );
}
