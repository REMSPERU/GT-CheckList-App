import { supabase } from '@/lib/supabase';
import type { EquipmentHistoryEntry } from '@/types/api';

class SupabaseEquipmentHistoryService {
  private tableName = 'equipos_historial';

  /**
   * Obtener historial por equipo ordenado por version descendente.
   */
  async getByEquipmentId(
    equipmentId: string,
    limit: number = 20,
  ): Promise<EquipmentHistoryEntry[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const { data, error } = await supabase
      .from(this.tableName)
      .select(
        'id, equipo_id, version, accion, changed_at, changed_by, old_data, new_data, changed_fields',
      )
      .eq('equipo_id', equipmentId)
      .order('version', { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return (data || []) as EquipmentHistoryEntry[];
  }
}

export const supabaseEquipmentHistoryService =
  new SupabaseEquipmentHistoryService();
