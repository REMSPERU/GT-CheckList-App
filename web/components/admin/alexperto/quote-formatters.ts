export function formatExternalStatus(
  status: string | null | undefined,
): string {
  if (!status) return 'Sin estado';
  const trimmed = status.trim();
  const normalized = trimmed.toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    PENDIENTE: 'Pendiente',
    SCHEDULED: 'Programado',
    PROGRAMADO: 'Programado',
    CONFIRMED: 'Confirmado',
    CONFIRMADO: 'Confirmado',
    IN_PROGRESS: 'En proceso',
    INPROGRESS: 'En progreso',
    EN_PROGRESO: 'En progreso',
    EN_PROCESO: 'En proceso',
    EXECUTED: 'Ejecutado',
    EJECUTADO: 'Ejecutado',
    IN_REVIEW: 'En revisión',
    EN_REVISION: 'En revisión',
    APPROVED: 'Aprobado',
    APROBADO: 'Aprobado',
    REJECTED: 'Rechazado',
    RECHAZADO: 'Rechazado',
    RESOLVED: 'Resuelto',
    RESUELTO: 'Resuelto',
    COMPLETED: 'Completado',
    COMPLETADO: 'Completado',
    CULMINADO: 'Culminado',
    CANCELLED: 'Cancelado',
    CANCELED: 'Cancelado',
    CANCELADO: 'Cancelado',
    SIN_ESTADO: 'Sin estado',
  };
  return map[normalized] ?? trimmed;
}

export function formatInternalStatus(status: string) {
  if (status === 'PENDIENTE_REVISION') return 'Pendiente';
  if (status === 'VALIDADO') return 'Marcado como revisado';
  return status.charAt(0) + status.slice(1).toLowerCase();
}
