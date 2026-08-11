interface StatusBadgeProps {
  children?: string | null;
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

function getVariant(status?: string | null): BadgeVariant {
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
    'bg-emerald-50 text-emerald-950 border border-emerald-300/80 font-bold',
  warning:
    'bg-amber-50 text-amber-950 border border-amber-300/80 font-bold',
  danger:
    'bg-rose-50 text-rose-950 border border-rose-300/80 font-bold',
  info:
    'bg-sky-50 text-sky-950 border border-sky-300/80 font-bold',
  neutral:
    'bg-slate-100 text-slate-800 border border-slate-300/80 font-semibold',
};

export function StatusBadge({ children }: StatusBadgeProps) {
  const variant = getVariant(children);
  const classes = VARIANT_CLASSES[variant];

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[0.72rem] tracking-tight shadow-2xs ${classes}`}>
      {children ?? '-'}
    </span>
  );
}
