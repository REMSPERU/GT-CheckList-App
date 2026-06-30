import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminMetric } from '@/types/admin';

export async function getAdminMetrics(
  supabase: SupabaseClient,
): Promise<AdminMetric[]> {
  const [properties, equipments, activeEquipments, pending, completed] =
    await Promise.all([
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('equipos').select('id', { count: 'exact', head: true }),
      supabase
        .from('equipos')
        .select('id', { count: 'exact', head: true })
        .eq('estatus', 'ACTIVO'),
      supabase
        .from('mantenimientos')
        .select('id', { count: 'exact', head: true })
        .in('estatus', ['NO_INICIADO', 'EN_PROGRESO', 'PENDIENTE']),
      supabase
        .from('mantenimientos')
        .select('id', { count: 'exact', head: true })
        .eq('estatus', 'FINALIZADO'),
    ]);

  const failedResult = [
    properties,
    equipments,
    activeEquipments,
    pending,
    completed,
  ].find(result => result.error);
  if (failedResult?.error) throw failedResult.error;

  return [
    { label: 'Inmuebles activos', value: properties.count ?? 0, note: 'Sedes operativas' },
    { label: 'Activos registrados', value: equipments.count ?? 0, note: 'Inventario total' },
    { label: 'Activos activos', value: activeEquipments.count ?? 0, note: 'Disponibles' },
    { label: 'Mantenimientos abiertos', value: pending.count ?? 0, note: 'Por atender' },
    { label: 'Mantenimientos finalizados', value: completed.count ?? 0, note: 'Historico' },
  ];
}
