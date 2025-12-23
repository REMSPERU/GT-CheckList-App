import { supabase } from '../lib/supabase';
import type { TableroElectricoResponse } from '../types/api';

export class SupabaseElectricalPanelService {
  private tableName = 'equipos';

  /**
   * Obtener tableros eléctricos por property ID
   */
  async getByProperty(propertyId: string, tipo?: string, search?: string): Promise<TableroElectricoResponse[]> {
    let query = supabase
      .from(this.tableName)
      .select(`
        *
      `)
      .eq('id_property', propertyId);


    // Filtro opcional por tipo (JSONB)
    if (tipo) {
      query = query.filter(
        'equipment_detail->>tipo_tablero',
        'eq',
        tipo
      );
    }

    // Filtro por búsqueda (código)
    if (search) {
      query = query.ilike('codigo', `%${search}%`);
    }


    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Obtener un tablero eléctrico por ID
   */
  async getById(id: string): Promise<TableroElectricoResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Actualizar el detalle de equipamiento (JSONB)
   */
  async updateEquipmentDetail(id: string, detail: any): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({
        equipment_detail: detail,
        config: true
      })
      .eq('id', id);

    if (error) throw error;
  }

}

export const supabaseElectricalPanelService = new SupabaseElectricalPanelService();
