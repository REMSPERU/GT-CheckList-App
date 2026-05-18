'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminMetric {
  label: string;
  value: number;
  note: string;
}

export interface AdminEquipmentRow {
  id: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  config: boolean | null;
  propertyName: string;
  propertyCode: string | null;
  propertyCity: string | null;
  equipmentName: string;
  equipmentAbbreviation: string | null;
}

export interface AdminPaginatedResult<T> {
  items: T[];
  total: number;
}

export interface AdminEquipmentFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface AdminEquipmentTypeRow {
  id: string;
  nombre: string;
  abreviatura: string | null;
  frecuencia: string | null;
}

export interface AdminChecklistQuestionRow {
  id: string;
  equipamento_id: string;
  equipmentName: string;
  pregunta: string;
  orden: number | null;
  activa: boolean | null;
  ponderado: number | string | null;
  updated_at: string | null;
}

export interface AdminChecklistAnswerItem {
  pregunta_id: string;
  pregunta: string;
  orden: number | null;
  status_ok: boolean | null;
  observacion: string | null;
  fotos: unknown[];
}

export interface AdminChecklistResponseRow {
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
  answers: AdminChecklistAnswerItem[];
}

export interface AdminPropertyRow {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  city: string | null;
  is_active: boolean | null;
  maintenance_priority: string | null;
}

export interface AdminMaintenanceRow {
  id: string;
  codigo: string | null;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  estatus: string | null;
  propertyName: string;
  equipmentCode: string | null;
  equipmentType: string;
}

interface RelatedProperty {
  name?: string | null;
  code?: string | null;
  city?: string | null;
}

interface RelatedEquipmentType {
  nombre?: string | null;
  abreviatura?: string | null;
}

interface EquipmentQueryRow {
  id: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  config: boolean | null;
  properties?: RelatedProperty | RelatedProperty[] | null;
  equipamentos?: RelatedEquipmentType | RelatedEquipmentType[] | null;
}

interface EquipmentTypeQueryRow {
  id: string;
  nombre: string;
  abreviatura: string | null;
  frecuencia: string | null;
}

interface ChecklistQuestionQueryRow {
  id: string;
  equipamento_id: string;
  pregunta: string;
  orden: number | null;
  activa: boolean | null;
  ponderado: number | string | null;
  updated_at: string | null;
  equipamentos?: RelatedEquipmentType | RelatedEquipmentType[] | null;
}

interface ChecklistAnswersJson {
  respuestas?: AdminChecklistAnswerItem[];
}

interface ChecklistResponseQueryRow {
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
  respuestas_json: ChecklistAnswersJson | null;
}

interface MaintenanceQueryRow {
  id: string;
  codigo: string | null;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  estatus: string | null;
  equipos?:
    | (Pick<EquipmentQueryRow, 'codigo'> & {
        properties?: RelatedProperty | RelatedProperty[] | null;
        equipamentos?: RelatedEquipmentType | RelatedEquipmentType[] | null;
      })
    | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getAdminMetrics(
  supabase: SupabaseClient,
): Promise<AdminMetric[]> {
  const [properties, equipments, activeEquipments, pending, completed] =
    await Promise.all([
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('equipos').select('id', { count: 'exact', head: true }),
      supabase
        .from('equipos')
        .select('id', { count: 'exact', head: true })
        .eq('estatus', 'ACTIVO'),
      supabase
        .from('mantenimientos')
        .select('id', { count: 'exact', head: true })
        .in('estatus', ['NO_INICIADO', 'EN_PROGRESO', 'PENDIENTE']),
      supabase
        .from('mantenimientos')
        .select('id', { count: 'exact', head: true })
        .eq('estatus', 'FINALIZADO'),
    ]);

  const results = [
    properties,
    equipments,
    activeEquipments,
    pending,
    completed,
  ];
  const failedResult = results.find(result => result.error);
  if (failedResult?.error) throw failedResult.error;

  return [
    {
      label: 'Inmuebles activos',
      value: properties.count ?? 0,
      note: 'Sedes operativas',
    },
    {
      label: 'Equipos registrados',
      value: equipments.count ?? 0,
      note: 'Inventario total',
    },
    {
      label: 'Equipos activos',
      value: activeEquipments.count ?? 0,
      note: 'Disponibles',
    },
    {
      label: 'Mantenimientos abiertos',
      value: pending.count ?? 0,
      note: 'Por atender',
    },
    {
      label: 'Mantenimientos finalizados',
      value: completed.count ?? 0,
      note: 'Historico',
    },
  ];
}

export async function listAdminEquipments(
  supabase: SupabaseClient,
  filters: AdminEquipmentFilters,
): Promise<AdminPaginatedResult<AdminEquipmentRow>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  const search = filters.search?.trim();

  let query = supabase
    .from('equipos')
    .select(
      `
        id,
        codigo,
        ubicacion,
        detalle_ubicacion,
        estatus,
        config,
        properties (name, code, city),
        equipamentos (nombre, abreviatura)
      `,
      { count: 'exact' },
    )
    .order('codigo', { ascending: true });

  if (filters.status && filters.status !== 'TODOS') {
    query = query.eq('estatus', filters.status);
  }

  if (search) {
    query = query.or(
      `codigo.ilike.%${search}%,ubicacion.ilike.%${search}%,detalle_ubicacion.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  const items = ((data ?? []) as EquipmentQueryRow[]).map(item => {
    const property = firstRelation(item.properties);
    const equipmentType = firstRelation(item.equipamentos);

    return {
      id: item.id,
      codigo: item.codigo,
      ubicacion: item.ubicacion,
      detalle_ubicacion: item.detalle_ubicacion,
      estatus: item.estatus,
      config: item.config,
      propertyName: property?.name ?? 'Sin inmueble',
      propertyCode: property?.code ?? null,
      propertyCity: property?.city ?? null,
      equipmentName: equipmentType?.nombre ?? 'Sin tipo',
      equipmentAbbreviation: equipmentType?.abreviatura ?? null,
    };
  });

  return {
    items,
    total: count ?? 0,
  };
}

export async function listAdminProperties(
  supabase: SupabaseClient,
): Promise<AdminPropertyRow[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, address, city, is_active, maintenance_priority')
    .order('name', { ascending: true })
    .limit(250);

  if (error) throw error;

  return (data ?? []) as AdminPropertyRow[];
}

export async function listAdminMaintenances(
  supabase: SupabaseClient,
): Promise<AdminMaintenanceRow[]> {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select(
      `
        id,
        codigo,
        dia_programado,
        tipo_mantenimiento,
        estatus,
        equipos (
          codigo,
          properties (name),
          equipamentos (nombre)
        )
      `,
    )
    .order('dia_programado', { ascending: false })
    .limit(250);

  if (error) throw error;

  return ((data ?? []) as MaintenanceQueryRow[]).map(item => {
    const property = firstRelation(item.equipos?.properties);
    const equipmentType = firstRelation(item.equipos?.equipamentos);

    return {
      id: item.id,
      codigo: item.codigo,
      dia_programado: item.dia_programado,
      tipo_mantenimiento: item.tipo_mantenimiento,
      estatus: item.estatus,
      propertyName: property?.name ?? 'Sin inmueble',
      equipmentCode: item.equipos?.codigo ?? null,
      equipmentType: equipmentType?.nombre ?? 'Sin tipo',
    };
  });
}

export async function listAdminEquipmentTypes(
  supabase: SupabaseClient,
): Promise<AdminEquipmentTypeRow[]> {
  const { data, error } = await supabase
    .from('equipamentos')
    .select('id, nombre, abreviatura, frecuencia')
    .order('nombre', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as EquipmentTypeQueryRow[]).map(item => ({
    id: item.id,
    nombre: item.nombre,
    abreviatura: item.abreviatura,
    frecuencia: item.frecuencia,
  }));
}

export async function listAdminChecklistQuestions(
  supabase: SupabaseClient,
  equipamentoId?: string,
): Promise<AdminChecklistQuestionRow[]> {
  let query = supabase
    .from('preguntas_equipamento')
    .select(
      `
        id,
        equipamento_id,
        pregunta,
        orden,
        activa,
        ponderado,
        updated_at,
        equipamentos (nombre, abreviatura)
      `,
    )
    .order('orden', { ascending: true });

  if (equipamentoId) {
    query = query.eq('equipamento_id', equipamentoId);
  }

  const { data, error } = await query.limit(500);

  if (error) throw error;

  return ((data ?? []) as ChecklistQuestionQueryRow[]).map(item => {
    const equipmentType = firstRelation(item.equipamentos);

    return {
      id: item.id,
      equipamento_id: item.equipamento_id,
      equipmentName: equipmentType?.nombre ?? 'Sin tipo',
      pregunta: item.pregunta,
      orden: item.orden,
      activa: item.activa,
      ponderado: item.ponderado,
      updated_at: item.updated_at,
    };
  });
}

export async function listAdminChecklistResponses(
  supabase: SupabaseClient,
  filters: { page: number; pageSize: number; equipamentoId?: string },
): Promise<AdminPaginatedResult<AdminChecklistResponseRow>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from('checklist_response')
    .select(
      `
        id,
        client_submission_id,
        submitted_at,
        building_name,
        equipamento_nombre,
        equipo_codigo,
        frequency,
        period_start,
        total_questions,
        total_ok,
        total_observed,
        total_photos,
        respuestas_json
      `,
      { count: 'exact' },
    )
    .order('submitted_at', { ascending: false });

  if (filters.equipamentoId) {
    query = query.eq('equipamento_id', filters.equipamentoId);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  const items = ((data ?? []) as ChecklistResponseQueryRow[]).map(item => ({
    id: item.id,
    client_submission_id: item.client_submission_id,
    submitted_at: item.submitted_at,
    building_name: item.building_name,
    equipamento_nombre: item.equipamento_nombre,
    equipo_codigo: item.equipo_codigo,
    frequency: item.frequency,
    period_start: item.period_start,
    total_questions: item.total_questions,
    total_ok: item.total_ok,
    total_observed: item.total_observed,
    total_photos: item.total_photos,
    answers: item.respuestas_json?.respuestas ?? [],
  }));

  return {
    items,
    total: count ?? 0,
  };
}

export async function updateAdminChecklistQuestion(
  supabase: SupabaseClient,
  input: { id: string; activa: boolean; ponderado: string | number | null },
): Promise<void> {
  const parsedWeight =
    typeof input.ponderado === 'string' && input.ponderado.trim() === ''
      ? null
      : typeof input.ponderado === 'string'
        ? Number(input.ponderado)
        : input.ponderado;

  const { error } = await supabase
    .from('preguntas_equipamento')
    .update({
      activa: input.activa,
      ponderado: parsedWeight,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) throw error;
}
