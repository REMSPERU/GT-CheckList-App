import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminMetric } from '@/types/admin';

const IN_FILTER_BATCH_SIZE = 400;

async function countMaintenancesByEquipment(
  supabase: SupabaseClient,
  equipmentIds: string[],
  statuses: string[],
): Promise<number> {
  let total = 0;

  for (
    let index = 0;
    index < equipmentIds.length;
    index += IN_FILTER_BATCH_SIZE
  ) {
    const batch = equipmentIds.slice(index, index + IN_FILTER_BATCH_SIZE);
    let query = supabase
      .from('mantenimientos')
      .select('id', { count: 'exact', head: true })
      .in('id_equipo', batch);

    query =
      statuses.length === 1
        ? query.eq('estatus', statuses[0])
        : query.in('estatus', statuses);

    const { count, error } = await query;
    if (error) throw error;
    total += count ?? 0;
  }

  return total;
}

async function listEquipmentIdsByProperties(
  supabase: SupabaseClient,
  propertyIds: string[],
): Promise<string[]> {
  const equipmentIds: string[] = [];

  for (
    let index = 0;
    index < propertyIds.length;
    index += IN_FILTER_BATCH_SIZE
  ) {
    const batch = propertyIds.slice(index, index + IN_FILTER_BATCH_SIZE);
    const { data, error } = await supabase
      .from('equipos')
      .select('id')
      .in('id_property', batch);

    if (error) throw error;
    equipmentIds.push(...(data ?? []).map(item => item.id as string));
  }

  return equipmentIds;
}

export async function getAdminMetrics(
  supabase: SupabaseClient,
): Promise<AdminMetric[]> {
  const { data: activeProperties, error: propertiesError } = await supabase
    .from('properties')
    .select('id')
    .eq('is_active', true);

  if (propertiesError) throw propertiesError;

  const propertyIds = (activeProperties ?? []).map(item => item.id as string);

  if (propertyIds.length === 0) {
    return buildMetrics(0, 0, 0, 0, 0);
  }

  const [equipments, activeEquipments, equipmentIds] = await Promise.all([
    supabase
      .from('equipos')
      .select('id', { count: 'exact', head: true })
      .in('id_property', propertyIds),
    supabase
      .from('equipos')
      .select('id', { count: 'exact', head: true })
      .in('id_property', propertyIds)
      .eq('estatus', 'ACTIVO'),
    listEquipmentIdsByProperties(supabase, propertyIds),
  ]);

  if (equipments.error) throw equipments.error;
  if (activeEquipments.error) throw activeEquipments.error;

  const [pendingCount, completedCount] =
    equipmentIds.length > 0
      ? await Promise.all([
          countMaintenancesByEquipment(supabase, equipmentIds, [
            'NO_INICIADO',
            'EN_PROGRESO',
            'PENDIENTE',
          ]),
          countMaintenancesByEquipment(supabase, equipmentIds, ['FINALIZADO']),
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
