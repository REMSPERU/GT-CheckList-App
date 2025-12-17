import { supabase } from '../lib/supabase';
import type { TableroElectricoResponse } from '../types/api';

export class SupabaseElectricalPanelService {
  private tableName = 'tablero_electrico';

  /**
   * Obtener tableros eléctricos por property ID
   */
  async getByProperty(propertyId: string, tipo?: string): Promise<TableroElectricoResponse[]> {
    let query = supabase
      .from(this.tableName)
      .select(`
        id,
        id_property,
        tipo,
        ubicacion,
        rotulo,
        codigo
      `)
      .eq('id_property', propertyId);

    // Filtro opcional por tipo
    if (tipo) {
      query = query.eq('tipo', tipo);
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
      .select(`
        id,
        id_property,
        tipo,
        ubicacion,
        rotulo,
        codigo
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Crear un nuevo tablero eléctrico
   */
  async create(tablero: Omit<TableroElectricoResponse, 'id'>): Promise<TableroElectricoResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(tablero)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Actualizar un tablero eléctrico
   */
  async update(id: string, tablero: Partial<Omit<TableroElectricoResponse, 'id'>>): Promise<TableroElectricoResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(tablero)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Eliminar un tablero eléctrico
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const supabaseElectricalPanelService = new SupabaseElectricalPanelService();
