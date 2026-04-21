import { supabase } from '@/lib/supabase';

export interface CreateEquipmentData {
  id_property: string;
  id_equipamento: string;
  codigo: string;
  ubicacion: string;
  detalle_ubicacion?: string;
  estatus?: string;
  equipment_detail?: Record<string, unknown>;
  config?: boolean;
}

export interface UpdateEquipmentData {
  ubicacion?: string;
  detalle_ubicacion?: string | null;
  estatus?: string;
  equipment_detail?: Record<string, unknown> | null;
  config?: boolean;
}

/**
 * Create a new equipment entry in Supabase
 */
export async function createEquipment(data: CreateEquipmentData) {
  const { data: result, error } = await supabase
    .from('equipos')
    .insert({
      id_property: data.id_property,
      id_equipamento: data.id_equipamento,
      codigo: data.codigo,
      ubicacion: data.ubicacion,
      detalle_ubicacion: data.detalle_ubicacion || null,
      estatus: data.estatus || 'ACTIVO',
      equipment_detail: data.equipment_detail || {},
      config: data.config ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Update an equipment entry in Supabase.
 * History is persisted by DB trigger in equipos_historial.
 */
export async function updateEquipment(id: string, data: UpdateEquipmentData) {
  const payload: Record<string, unknown> = {};

  if (typeof data.ubicacion === 'string') {
    payload.ubicacion = data.ubicacion;
  }

  if (data.detalle_ubicacion !== undefined) {
    payload.detalle_ubicacion = data.detalle_ubicacion;
  }

  if (typeof data.estatus === 'string') {
    payload.estatus = data.estatus;
  }

  if (data.equipment_detail !== undefined) {
    payload.equipment_detail = data.equipment_detail;
  }

  if (typeof data.config === 'boolean') {
    payload.config = data.config;
  }

  const { data: result, error } = await supabase
    .from('equipos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Soft-delete equipment by setting status to INACTIVO
 */
export async function softDeleteEquipment(id: string) {
  const { error } = await supabase
    .from('equipos')
    .update({ estatus: 'INACTIVO' })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Generate next equipment code based on prefix and existing codes
 */
export async function generateEquipmentCode(
  propertyId: string,
  prefix: string = 'LE',
): Promise<string> {
  const { data, error } = await supabase
    .from('equipos')
    .select('codigo')
    .eq('id_property', propertyId)
    .like('codigo', `${prefix}-%`)
    .order('codigo', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNum = 1;
  if (data && data.length > 0) {
    const match = data[0].codigo?.match(/-(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}
