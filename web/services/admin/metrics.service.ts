import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import type { AdminMetric } from '@/types/admin';

const IN_FILTER_BATCH_SIZE = 400;
const SESSION_PAGE_SIZE = 500;

class AdminMetricsError extends Error {
  readonly retryable: boolean;

  constructor(resource: string, status: number, cause: PostgrestError) {
    super(`No se pudieron cargar los datos de ${resource}.`, { cause });
    this.retryable =
      [0, 408, 429, 502, 503, 504].includes(status) || cause.code === '57014';
  }
}

export function isRetryableAdminMetricsError(error: unknown) {
  return error instanceof AdminMetricsError && error.retryable;
}

async function countMaintenancesBySession(
  supabase: SupabaseClient,
  sessionIds: string[],
  statuses: string[],
): Promise<number> {
  let total = 0;

  for (
    let index = 0;
    index < sessionIds.length;
    index += IN_FILTER_BATCH_SIZE
  ) {
    const batch = sessionIds.slice(index, index + IN_FILTER_BATCH_SIZE);
    let query = supabase
      .from('mantenimientos')
      .select('id', { count: 'exact', head: true })
      .in('id_sesion', batch);

    query =
      statuses.length === 1
        ? query.eq('estatus', statuses[0])
        : query.in('estatus', statuses);

    const { count, error, status } = await query;
    if (error) throw new AdminMetricsError('mantenimientos', status, error);
    total += count ?? 0;
  }

  return total;
}

async function listSessionIdsByProperties(
  supabase: SupabaseClient,
  propertyIds: string[],
): Promise<string[]> {
  const sessionIds: string[] = [];

  for (
    let index = 0;
    index < propertyIds.length;
    index += IN_FILTER_BATCH_SIZE
  ) {
    const batch = propertyIds.slice(index, index + IN_FILTER_BATCH_SIZE);
    for (let offset = 0; ; offset += SESSION_PAGE_SIZE) {
      const { data, error, status } = await supabase
        .from('sesion_mantenimiento')
        .select('id')
        .in('id_property', batch)
        .order('id')
        .range(offset, offset + SESSION_PAGE_SIZE - 1);

      if (error)
        throw new AdminMetricsError('sesiones de mantenimiento', status, error);
      const page = data ?? [];
      sessionIds.push(...page.map(item => item.id as string));
      if (page.length < SESSION_PAGE_SIZE) break;
    }
  }

  return sessionIds;
}

export async function getAdminMetrics(
  supabase: SupabaseClient,
): Promise<AdminMetric[]> {
  const {
    data: activeProperties,
    error: propertiesError,
    status,
  } = await supabase.from('properties').select('id').eq('is_active', true);

  if (propertiesError)
    throw new AdminMetricsError('inmuebles', status, propertiesError);

  const propertyIds = (activeProperties ?? []).map(item => item.id as string);

  if (propertyIds.length === 0) {
    return buildMetrics(0, 0, 0, 0, 0);
  }

  const [equipments, activeEquipments, sessionIds] = await Promise.all([
    supabase
      .from('equipos')
      .select('id', { count: 'exact', head: true })
      .in('id_property', propertyIds),
    supabase
      .from('equipos')
      .select('id', { count: 'exact', head: true })
      .in('id_property', propertyIds)
      .eq('estatus', 'ACTIVO'),
    listSessionIdsByProperties(supabase, propertyIds),
  ]);

  if (equipments.error) {
    throw new AdminMetricsError(
      'activos registrados',
      equipments.status,
      equipments.error,
    );
  }
  if (activeEquipments.error) {
    throw new AdminMetricsError(
      'activos activos',
      activeEquipments.status,
      activeEquipments.error,
    );
  }

  const [pendingCount, completedCount] =
    sessionIds.length > 0
      ? await Promise.all([
          countMaintenancesBySession(supabase, sessionIds, [
            'NO_INICIADO',
            'EN_PROGRESO',
            'PENDIENTE',
          ]),
          countMaintenancesBySession(supabase, sessionIds, ['FINALIZADO']),
        ])
      : [0, 0];

  return buildMetrics(
    propertyIds.length,
    equipments.count ?? 0,
    activeEquipments.count ?? 0,
    pendingCount,
    completedCount,
  );
}

function buildMetrics(
  propertiesCount: number,
  equipmentsCount: number,
  activeEquipmentsCount: number,
  pendingCount: number,
  completedCount: number,
): AdminMetric[] {
  return [
    {
      label: 'Inmuebles activos',
      value: propertiesCount,
      note: 'Sedes operativas',
    },
    {
      label: 'Activos registrados',
      value: equipmentsCount,
      note: 'Inventario total',
    },
    {
      label: 'Activos activos',
      value: activeEquipmentsCount,
      note: 'Disponibles',
    },
    {
      label: 'Mantenimientos abiertos',
      value: pendingCount,
      note: 'Por atender',
    },
    {
      label: 'Mantenimientos finalizados',
      value: completedCount,
      note: 'Historico',
    },
  ];
}
