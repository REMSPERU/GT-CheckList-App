import { supabase } from '../lib/supabase';
import type { PropertyResponse, PropertyCreateRequest } from '../types/api';

export class SupabasePropertyService {
  private tableName = 'properties';

  /**
   * Obtener una propiedad por ID
   */
  async getById(id: string): Promise<PropertyResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Listar propiedades con filtros
   */
  async list(filters?: {
    search?: string;
    city?: string;
    property_type?: string;
    is_active?: boolean;
    maintenance_priority?: string;
    skip?: number;
    limit?: number;
  }) {
    let query = supabase.from(this.tableName).select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,address.ilike.%${filters.search}%`,
      );
    }

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.property_type) {
      query = query.eq('property_type', filters.property_type);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.maintenance_priority) {
      query = query.eq('maintenance_priority', filters.maintenance_priority);
    }

    // Paginación
    const skip = filters?.skip || 0;
    const limit = filters?.limit || 50;
    query = query.range(skip, skip + limit - 1);

    // Ordenar por fecha de creación descendente
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      skip,
      limit,
    };
  }

  /**
   * Crear una nueva propiedad
   */
  async create(propertyData: PropertyCreateRequest): Promise<PropertyResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        ...propertyData,
        is_active: true,
        property_type: propertyData.property_type || 'BUILDING',
        country: propertyData.country || 'PE',
        maintenance_priority: propertyData.maintenance_priority || 'MEDIUM',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Actualizar una propiedad
   */
  async update(
    id: string,
    propertyData: PropertyCreateRequest,
  ): Promise<PropertyResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        ...propertyData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Eliminar una propiedad (soft delete)
   */
  async delete(id: string): Promise<PropertyResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Desactivar una propiedad
   */
  async deactivate(id: string): Promise<PropertyResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Activar una propiedad
   */
  async activate(id: string): Promise<PropertyResponse> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const supabasePropertyService = new SupabasePropertyService();
