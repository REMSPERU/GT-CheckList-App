import type { SupabaseClient } from '@supabase/supabase-js';

export interface RelatedProperty {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  city?: string | null;
}

interface RelatedSystem {
  id: string;
  nombre?: string | null;
}

export interface EquipmentQueryRow {
  id: string;
  id_property: string | null;
  id_equipamento: string | null;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  config: boolean | null;
}

export interface EquipmentTypeQueryRow {
  id: string;
  nombre: string;
  abreviatura: string | null;
  Frecuencia: string | null;
  id_sistema: string | null;
}

export interface ChecklistQuestionQueryRow {
  id: string;
  equipamento_id: string;
  pregunta: string;
  orden: number | null;
  activa: boolean | null;
  ponderado: number | string | null;
  updated_at: string | null;
}

export interface ChecklistAnswersJson {
  respuestas?: import('@/types/admin').AdminChecklistAnswerItem[];
}

export interface ChecklistResponseQueryRow {
  id: string;
  client_submission_id: string | null;
  submitted_at: string | null;
  building_name: string | null;
  equipamento_nombre: string | null;
  equipo_codigo: string | null;
  frequency: string | null;
  period_start: string | null;
  total_questions: number | null;
  total_ok: number | null;
  total_observed: number | null;
  total_photos: number | null;
  evidencia_general_fotos:
    | import('@/types/admin').AdminChecklistPhotoRef[]
    | null;
  respuestas_json: ChecklistAnswersJson | null;
}

export interface MaintenanceQueryRow {
  id: string;
  id_equipo: string | null;
  codigo: string | null;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  estatus: string | null;
}

export function uniqueValues(values: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => !!value)),
  );
}

export async function getSystemNameById(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('sistemas').select('id, nombre');
  if (error) throw error;

  return new Map(
    ((data ?? []) as RelatedSystem[]).map(item => [
      item.id,
      item.nombre ?? 'Sin sistema',
    ]),
  );
}

export async function getPropertiesById(
  supabase: SupabaseClient,
  propertyIds: string[],
): Promise<Map<string, RelatedProperty>> {
  if (propertyIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('properties')
    .select('id, name, code, city')
    .in('id', propertyIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as RelatedProperty[]).map(item => [String(item.id), item]),
  );
}
