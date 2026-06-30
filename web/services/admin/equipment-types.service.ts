import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminEquipmentTypeRow } from '@/types/admin';

import { getSystemNameById, type EquipmentTypeQueryRow } from './admin-query-helpers';

export async function listAdminEquipmentTypes(
  supabase: SupabaseClient,
): Promise<AdminEquipmentTypeRow[]> {
  const [systemsById, equipmentTypesResult] = await Promise.all([
    getSystemNameById(supabase),
    supabase
      .from('equipamentos')
      .select('id, nombre, abreviatura, Frecuencia, id_sistema, image_url')
      .order('nombre', { ascending: true }),
  ]);

  const { data, error } = equipmentTypesResult;
  if (error) throw error;

  return ((data ?? []) as EquipmentTypeQueryRow[]).map(item => ({
    id: item.id,
    nombre: item.nombre,
    abreviatura: item.abreviatura,
    frecuencia: item.Frecuencia,
    systemName: item.id_sistema
      ? (systemsById.get(item.id_sistema) ?? 'Sin especialidad')
      : 'Sin especialidad',
    systemId: item.id_sistema,
    image_url: item.image_url ?? null,
  }));
}

export async function updateAdminEquipmentTypeImage(
  supabase: SupabaseClient,
  typeId: string,
  imageUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('equipamentos')
    .update({ image_url: imageUrl })
    .eq('id', typeId);

  if (error) throw error;
}
