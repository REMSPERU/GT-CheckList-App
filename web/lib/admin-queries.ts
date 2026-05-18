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
  systemName: string;
}

export interface AdminChecklistQuestionRow {
  id: string;
  equipamento_id: string;
  systemName: string;
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
  id?: string | null;
  name?: string | null;
  code?: string | null;
  city?: string | null;
}

interface RelatedSystem {
  id: string;
  nombre?: string | null;
}

interface EquipmentQueryRow {
  id: string;
  id_property: string | null;
  id_equipamento: string | null;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  config: boolean | null;
}

interface EquipmentTypeQueryRow {
  id: string;
  nombre: string;
  abreviatura: string | null;
  frecuencia: string | null;
  id_sistema: string | null;
}

interface ChecklistQuestionQueryRow {
  id: string;
  equipamento_id: string;
  pregunta: string;
  orden: number | null;
  activa: boolean | null;
  ponderado: number | string | null;
  updated_at: string | null;
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
  id_equipo: string | null;
  codigo: string | null;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  estatus: string | null;
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
}

async function getSystemNameById(
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

async function getPropertiesById(
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
        id_property,
        id_equipamento,
        codigo,
        ubicacion,
        detalle_ubicacion,
        estatus,
        config
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

  const rows = (data ?? []) as EquipmentQueryRow[];
  const [propertiesById, equipmentTypes] = await Promise.all([
    getPropertiesById(
      supabase,
      uniqueValues(rows.map(item => item.id_property)),
    ),
    listAdminEquipmentTypes(supabase),
  ]);
  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );

  const items = rows.map(item => {
    const property = item.id_property
      ? propertiesById.get(item.id_property)
      : null;
    const equipmentType = item.id_equipamento
      ? equipmentTypesById.get(item.id_equipamento)
      : null;

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
        id_equipo,
        codigo,
        dia_programado,
        tipo_mantenimiento,
        estatus
      `,
    )
    .order('dia_programado', { ascending: false })
    .limit(250);

  if (error) throw error;

  const rows = (data ?? []) as MaintenanceQueryRow[];
  const equipmentIds = uniqueValues(rows.map(item => item.id_equipo));
  const { data: equipmentData, error: equipmentError } = equipmentIds.length
    ? await supabase
      .from('equipos')
      .select('id, id_property, id_equipamento, codigo')
      .in('id', equipmentIds)
    : { data: [], error: null };

  if (equipmentError) throw equipmentError;

  const equipmentRows = (equipmentData ?? []) as Array<
    Pick<EquipmentQueryRow, 'id' | 'id_property' | 'id_equipamento' | 'codigo'>
  >;
  const equipmentById = new Map(equipmentRows.map(item => [item.id, item]));
  const [propertiesById, equipmentTypes] = await Promise.all([
    getPropertiesById(
      supabase,
      uniqueValues(equipmentRows.map(item => item.id_property)),
    ),
    listAdminEquipmentTypes(supabase),
  ]);
  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );

  return rows.map(item => {
    const equipment = item.id_equipo ? equipmentById.get(item.id_equipo) : null;
    const property = equipment?.id_property
      ? propertiesById.get(equipment.id_property)
      : null;
    const equipmentType = equipment?.id_equipamento
      ? equipmentTypesById.get(equipment.id_equipamento)
      : null;

    return {
      id: item.id,
      codigo: item.codigo,
      dia_programado: item.dia_programado,
      tipo_mantenimiento: item.tipo_mantenimiento,
      estatus: item.estatus,
      propertyName: property?.name ?? 'Sin inmueble',
      equipmentCode: equipment?.codigo ?? null,
      equipmentType: equipmentType?.nombre ?? 'Sin tipo',
    };
  });
}

export async function listAdminEquipmentTypes(
  supabase: SupabaseClient,
): Promise<AdminEquipmentTypeRow[]> {
  const [systemsById, equipmentTypesResult] = await Promise.all([
    getSystemNameById(supabase),
    supabase
      .from('equipamentos')
      .select('id, nombre, abreviatura, Frecuencia, id_sistema')
      .order('nombre', { ascending: true }),
  ]);

  const { data, error } = equipmentTypesResult;

  if (error) throw error;

  return ((data ?? []) as EquipmentTypeQueryRow[]).map(item => ({
    id: item.id,
    nombre: item.nombre,
    abreviatura: item.abreviatura,
    frecuencia: item.frecuencia,
    systemName: item.id_sistema
      ? (systemsById.get(item.id_sistema) ?? 'Sin sistema')
      : 'Sin sistema',
  }));
}

export async function listAdminChecklistQuestions(
  supabase: SupabaseClient,
  equipamentoId?: string,
): Promise<AdminChecklistQuestionRow[]> {
  const equipmentTypes = await listAdminEquipmentTypes(supabase);
  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );

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
        updated_at
      `,
    )
    .order('orden', { ascending: true });

  if (equipamentoId) {
    query = query.eq('equipamento_id', equipamentoId);
  }

  const { data, error } = await query.limit(500);

  if (error) throw error;

  return ((data ?? []) as ChecklistQuestionQueryRow[]).map(item => {
    const equipmentType = equipmentTypesById.get(item.equipamento_id);

    return {
      id: item.id,
      equipamento_id: item.equipamento_id,
      systemName: equipmentType?.systemName ?? 'Sin sistema',
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
