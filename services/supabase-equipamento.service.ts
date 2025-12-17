import { supabase } from '../lib/supabase';
import type { EquipamentoResponse, EquipamentoListResponse } from '../types/api';

export class SupabaseEquipamentoService {
  private tableName = 'equipamentos';
  private relationTableName = 'equipamentos_property';

  /**
   * Obtener todos los equipamentos
   */
  async getAll(): Promise<EquipamentoListResponse> {
    const { data, error, count } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .order('nombre', { ascending: true });

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
    };
  }

  /**
   * Obtener equipamentos asociados a una propiedad
   */
  async getByProperty(propertyId: string): Promise<EquipamentoListResponse> {
    const { data, error, count } = await supabase
      .from(this.relationTableName)
      .select(`
        equipamentos (
          id,
          nombre,
          abreviatura
        )
      `, { count: 'exact' })
      .eq('id_property', propertyId);

    if (error) throw error;

    // Transformar la respuesta de Supabase al formato esperado
    const items = data?.map(item => {
      const equipamento = (item as any).equipamentos;
      return {
        id: equipamento.id,
        nombre: equipamento.nombre,
        abreviatura: equipamento.abreviatura,
      } as EquipamentoResponse;
    }) || [];

    return {
      items,
      total: count || 0,
    };
  }

  /**
   * Asociar un equipamento a una propiedad
   */
  async linkToProperty(equipamentoId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from(this.relationTableName)
      .insert({
        id_equipamentos: equipamentoId,
        id_property: propertyId,
      });

    if (error) throw error;
  }

  /**
   * Desasociar un equipamento de una propiedad
   */
  async unlinkFromProperty(equipamentoId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from(this.relationTableName)
      .delete()
      .eq('id_equipamentos', equipamentoId)
      .eq('id_property', propertyId);

    if (error) throw error;
  }

  /**
   * Obtener un equipamento por ID
   */
  async getById(id: string): Promise<EquipamentoResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Crear un nuevo equipamento
   */
  async create(equipamento: { nombre: string; abreviatura: string }): Promise<EquipamentoResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(equipamento)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Actualizar un equipamento
   */
  async update(id: string, equipamento: { nombre?: string; abreviatura?: string }): Promise<EquipamentoResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(equipamento)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Eliminar un equipamento
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const supabaseEquipamentoService = new SupabaseEquipamentoService();
