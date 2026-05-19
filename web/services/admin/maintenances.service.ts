import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminMaintenanceRow } from '@/types/admin';

import {
  getPropertiesById,
  uniqueValues,
  type EquipmentQueryRow,
  type MaintenanceQueryRow,
} from './admin-query-helpers';
import { listAdminEquipmentTypes } from './equipment-types.service';

export async function listAdminMaintenances(
  supabase: SupabaseClient,
): Promise<AdminMaintenanceRow[]> {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select(
      `
        id,
        id_equipo,
        codigo,
        dia_programado,
        tipo_mantenimiento,
        estatus
      `,
    )
    .order('dia_programado', { ascending: false })
    .limit(250);

  if (error) throw error;

  const rows = (data ?? []) as MaintenanceQueryRow[];
  const equipmentIds = uniqueValues(rows.map(item => item.id_equipo));
  const { data: equipmentData, error: equipmentError } = equipmentIds.length
    ? await supabase
        .from('equipos')
        .select('id, id_property, id_equipamento, codigo')
        .in('id', equipmentIds)
    : { data: [], error: null };

  if (equipmentError) throw equipmentError;

  const equipmentRows = (equipmentData ?? []) as Pick<
    EquipmentQueryRow,
    'id' | 'id_property' | 'id_equipamento' | 'codigo'
  >[];
  const equipmentById = new Map(equipmentRows.map(item => [item.id, item]));
  const [propertiesById, equipmentTypes] = await Promise.all([
    getPropertiesById(
      supabase,
      uniqueValues(equipmentRows.map(item => item.id_property)),
    ),
    listAdminEquipmentTypes(supabase),
  ]);
  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );

  return rows.map(item => {
    const equipment = item.id_equipo ? equipmentById.get(item.id_equipo) : null;
    const property = equipment?.id_property
      ? propertiesById.get(equipment.id_property)
      : null;
    const equipmentType = equipment?.id_equipamento
      ? equipmentTypesById.get(equipment.id_equipamento)
      : null;

    return {
      id: item.id,
      codigo: item.codigo,
      dia_programado: item.dia_programado,
      tipo_mantenimiento: item.tipo_mantenimiento,
      estatus: item.estatus,
      propertyName: property?.name ?? 'Sin inmueble',
      equipmentCode: equipment?.codigo ?? null,
      equipmentType: equipmentType?.nombre ?? 'Sin tipo',
    };
  });
}
