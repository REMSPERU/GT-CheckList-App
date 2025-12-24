import { supabase } from "../lib/supabase";
import type { TableroElectricoResponse } from "../types/api";

export class SupabaseElectricalPanelService {
  private tableName = "equipos";

  /**
   * Obtener tableros eléctricos por property ID
   */
  async getByProperty(
    propertyId: string,
    tipo?: string,
    search?: string,
    config?: boolean | null,
    locations?: string[]
  ): Promise<TableroElectricoResponse[]> {
    let query = supabase
      .from(this.tableName)
      .select(
        `
        *
      `
      )
      .eq("id_property", propertyId);

    // Filtro opcional por tipo (JSONB)
    if (tipo) {
      query = query.filter("equipment_detail->>tipo_tablero", "eq", tipo);
    }

    // Filtro por configuración
    if (config !== undefined && config !== null) {
      query = query.eq("config", config);
    }

    // Filtro por ubicación (Multi-select)
    if (locations && locations.length > 0) {
      // Use .in() filter for exact matches
      query = query.in("ubicacion", locations);
    }

    // Filtro por búsqueda (código o rótulo)
    if (search) {
      // Usamos .or() para buscar en codigo O en equipment_detail->rotulo
      // Nota: Para buscar dentro de jsonb con ilike en supabase-js client puede ser complejo directamete con .or()
      // Una alternativa robusta es usar filtro de texto plano si las columnas lo permiten, pero equipment_detail es JSONB.
      // La sintaxis de .or() permite referencias a columnas.
      // `codigo.ilike.%${search}%,equipment_detail->>rotulo.ilike.%${search}%`
      query = query.or(
        `codigo.ilike.%${search}%,equipment_detail->>rotulo.ilike.%${search}%`
      );
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
      .select("*")
      .eq("id", id)
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
        config: true,
      })
      .eq("id", id);

    if (error) throw error;
  }
}

export const supabaseElectricalPanelService =
  new SupabaseElectricalPanelService();
