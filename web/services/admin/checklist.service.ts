import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminChecklistQuestionRow,
  AdminChecklistQuestionUpdateInput,
  AdminChecklistResponseFilterOptions,
  AdminChecklistResponseFilters,
  AdminChecklistResponseRow,
  AdminChecklistScheduleProgress,
  AdminChecklistScheduleEquipmentItem,
  AdminChecklistScheduleFrequency,
  AdminChecklistScheduleRow,
  AdminChecklistScheduleUpsertInput,
  AdminPaginatedResult,
} from '@/types/admin';

import {
  type ChecklistQuestionQueryRow,
  type ChecklistResponseQueryRow,
} from './admin-query-helpers';
import { listAdminEquipmentTypes } from './equipment-types.service';
import { listAdminProperties } from './properties.service';

interface ChecklistScheduleQueryRow {
  id: string;
  property_id: string;
  equipamento_id: string;
  frequency: AdminChecklistScheduleFrequency;
  occurrences_per_day: number;
  window_start: string;
  window_end: string;
  timezone: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  updated_at: string | null;
}

interface ChecklistScheduleProgressEquipmentRow {
  id: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
}

interface ChecklistScheduleProgressResponseRow {
  equipo_id: string | null;
  submitted_at: string | null;
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
  filters: AdminChecklistResponseFilters,
): Promise<AdminPaginatedResult<AdminChecklistResponseRow>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from('checklist_response')
    .select(
      `
        id,
        client_submission_id,
        user_created,
        submitted_at,
        form_started_at,
        first_interaction_at,
        duration_seconds,
        interaction_count,
        equipo_id,
        building_name,
        equipamento_nombre,
        equipo_codigo,
        frequency,
        period_start,
        total_questions,
        total_ok,
        total_observed,
        total_photos,
        evidencia_general_fotos,
        respuestas_json
      `,
      { count: 'exact' },
    )
    .order('submitted_at', { ascending: false });

  if (filters.equipamentoId) {
    query = query.eq('equipamento_id', filters.equipamentoId);
  }

  if (filters.buildingName) {
    query = query.eq('building_name', filters.buildingName);
  }

  if (filters.reviewStatus === 'observed') {
    query = query.gt('total_observed', 0);
  }

  if (filters.reviewStatus === 'photos') {
    query = query.gt('total_photos', 0);
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%_]/g, '\\$&');
    query = query.or(
      [
        `building_name.ilike.%${term}%`,
        `equipamento_nombre.ilike.%${term}%`,
        `equipo_codigo.ilike.%${term}%`,
        `frequency.ilike.%${term}%`,
      ].join(','),
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const items = ((data ?? []) as ChecklistResponseQueryRow[]).map(
    mapChecklistResponse,
  );
  await hydrateAnswerWeights(supabase, items);

  return {
    items,
    total: count ?? 0,
  };
}

export async function listAdminChecklistSchedules(
  supabase: SupabaseClient,
): Promise<AdminChecklistScheduleRow[]> {
  const [properties, equipmentTypes, schedulesResult] = await Promise.all([
    listAdminProperties(supabase),
    listAdminEquipmentTypes(supabase),
    supabase
      .from('checklist_schedules')
      .select(
        `
          id,
          property_id,
          equipamento_id,
          frequency,
          occurrences_per_day,
          window_start,
          window_end,
          timezone,
          start_date,
          end_date,
          is_active,
          updated_at
        `,
      )
      .order('updated_at', { ascending: false })
      .limit(500),
  ]);

  const { data, error } = schedulesResult;
  if (error) throw error;

  const propertiesById = new Map(properties.map(item => [item.id, item]));
  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );

  return ((data ?? []) as ChecklistScheduleQueryRow[]).map(item => {
    const property = propertiesById.get(item.property_id);
    const equipmentType = equipmentTypesById.get(item.equipamento_id);

    return {
      id: item.id,
      property_id: item.property_id,
      equipamento_id: item.equipamento_id,
      propertyName: property?.name ?? 'Inmueble sin nombre',
      equipmentName: equipmentType?.nombre ?? 'Tipo sin nombre',
      systemName: equipmentType?.systemName ?? 'Sin sistema',
      frequency: item.frequency,
      occurrences_per_day: item.occurrences_per_day,
      window_start: item.window_start,
      window_end: item.window_end,
      timezone: item.timezone,
      start_date: item.start_date,
      end_date: item.end_date,
      is_active: item.is_active,
      updated_at: item.updated_at,
    };
  });
}

export async function upsertAdminChecklistSchedule(
  supabase: SupabaseClient,
  input: AdminChecklistScheduleUpsertInput,
): Promise<void> {
  const { error } = await supabase.from('checklist_schedules').upsert(
    {
      property_id: input.propertyId,
      equipamento_id: input.equipamentoId,
      frequency: input.frequency,
      occurrences_per_day: input.occurrencesPerDay,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      timezone: input.timezone ?? 'America/Lima',
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      is_active: input.isActive,
      created_by: input.userId,
      updated_by: input.userId,
    },
    { onConflict: 'property_id,equipamento_id' },
  );

  if (error) throw error;
}

export async function listAdminChecklistScheduleEquipments(
  supabase: SupabaseClient,
  input: {
    propertyId: string;
    equipamentoId: string;
  },
): Promise<AdminChecklistScheduleEquipmentItem[]> {
  const { data, error } = await supabase
    .from('equipos')
    .select('id, codigo, ubicacion, detalle_ubicacion')
    .eq('id_property', input.propertyId)
    .eq('id_equipamento', input.equipamentoId)
    .order('codigo', { ascending: true })
    .limit(250);

  if (error) throw error;

  return (data ?? []) as AdminChecklistScheduleEquipmentItem[];
}

export async function listAdminChecklistPropertyEquipmentTypeIds(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('equipos')
    .select('id_equipamento')
    .eq('id_property', propertyId)
    .not('id_equipamento', 'is', null)
    .limit(1000);

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? [])
        .map(item => item.id_equipamento)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );
}

export async function getAdminChecklistScheduleProgress(
  supabase: SupabaseClient,
  input: {
    propertyId: string;
    equipamentoId: string;
    frequency: AdminChecklistScheduleFrequency;
    startDate: string | null;
    endDate: string | null;
  },
): Promise<AdminChecklistScheduleProgress> {
  const usesConfiguredRange =
    ['SEMANAL', 'MENSUAL'].includes(input.frequency) &&
    !!input.startDate &&
    !!input.endDate;
  const todayInLima = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
  }).format(new Date());
  const periodStart = usesConfiguredRange ? input.startDate : todayInLima;
  const periodEnd = usesConfiguredRange ? input.endDate : todayInLima;

  const { data: equipmentData, error: equipmentError } = await supabase
    .from('equipos')
    .select('id, codigo, ubicacion, detalle_ubicacion')
    .eq('id_property', input.propertyId)
    .eq('id_equipamento', input.equipamentoId)
    .order('codigo', { ascending: true });

  if (equipmentError) throw equipmentError;

  const equipmentRows = (equipmentData ??
    []) as ChecklistScheduleProgressEquipmentRow[];
  const equipmentIds = equipmentRows.map(item => item.id);

  if (equipmentIds.length === 0) {
    return { total: 0, completed: [], pending: [] };
  }

  const rangeStartUtc = new Date(`${periodStart}T00:00:00-05:00`);
  const rangeEndUtc = new Date(`${periodEnd}T00:00:00-05:00`);
  rangeEndUtc.setDate(rangeEndUtc.getDate() + 1);

  const { data: responseData, error: responseError } = await supabase
    .from('checklist_response')
    .select('equipo_id, submitted_at')
    .in('equipo_id', equipmentIds)
    .gte('submitted_at', rangeStartUtc.toISOString())
    .lt('submitted_at', rangeEndUtc.toISOString())
    .order('submitted_at', { ascending: false });

  if (responseError) throw responseError;

  const completedByEquipo = new Map<string, string>();
  ((responseData ?? []) as ChecklistScheduleProgressResponseRow[]).forEach(
    item => {
      if (item.equipo_id && item.submitted_at) {
        completedByEquipo.set(item.equipo_id, item.submitted_at);
      }
    },
  );

  const completed: AdminChecklistScheduleProgress['completed'] = [];
  const pending: AdminChecklistScheduleProgress['pending'] = [];

  for (const equipment of equipmentRows) {
    const item = {
      equipoId: equipment.id,
      codigo: equipment.codigo,
      ubicacion: equipment.ubicacion,
      detalle_ubicacion: equipment.detalle_ubicacion,
      submitted_at: completedByEquipo.get(equipment.id) ?? null,
    };

    if (item.submitted_at) {
      completed.push(item);
    } else {
      pending.push(item);
    }
  }

  return {
    total: equipmentRows.length,
    completed,
    pending,
  };
}

export async function getAdminChecklistResponseById(
  supabase: SupabaseClient,
  responseId: string,
): Promise<AdminChecklistResponseRow | null> {
  const { data, error } = await supabase
    .from('checklist_response')
    .select(
      `
        id,
        client_submission_id,
        user_created,
        submitted_at,
        form_started_at,
        first_interaction_at,
        duration_seconds,
        interaction_count,
        equipo_id,
        building_name,
        equipamento_nombre,
        equipo_codigo,
        frequency,
        period_start,
        total_questions,
        total_ok,
        total_observed,
        total_photos,
        evidencia_general_fotos,
        respuestas_json
      `,
    )
    .eq('id', responseId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const response = mapChecklistResponse(data as ChecklistResponseQueryRow);

  // Fetch user name via separate query to avoid foreign key / relationship errors
  if (response.user_created) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', response.user_created)
        .maybeSingle();

      if (userData) {
        const first = (userData as any).first_name ?? '';
        const last = (userData as any).last_name ?? '';
        const name = `${first} ${last}`.trim();
        if (name) {
          response.user_created_name = name;
        }
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  }

  await hydrateAnswerWeights(supabase, [response]);
  return response;
}

function mapChecklistResponse(
  item: ChecklistResponseQueryRow,
): AdminChecklistResponseRow {
  return {
    id: item.id,
    client_submission_id: item.client_submission_id,
    user_created: item.user_created,
    user_created_name: item.user_created,
    submitted_at: item.submitted_at,
    form_started_at: item.form_started_at,
    first_interaction_at: item.first_interaction_at,
    duration_seconds: item.duration_seconds,
    interaction_count: item.interaction_count,
    equipo_id: item.equipo_id,
    building_name: item.building_name,
    equipamento_nombre: item.equipamento_nombre,
    equipo_codigo: item.equipo_codigo,
    frequency: item.frequency,
    period_start: item.period_start,
    total_questions: item.total_questions,
    total_ok: item.total_ok,
    total_observed: item.total_observed,
    total_photos: item.total_photos,
    generalPhotos: item.evidencia_general_fotos ?? [],
    answers: item.respuestas_json?.respuestas ?? [],
  };
}

async function hydrateAnswerWeights(
  supabase: SupabaseClient,
  responses: AdminChecklistResponseRow[],
): Promise<void> {
  const questionIds = Array.from(
    new Set(
      responses.flatMap(response =>
        response.answers
          .filter(answer => answer.ponderado === undefined)
          .map(answer => answer.pregunta_id),
      ),
    ),
  );

  if (questionIds.length === 0) return;

  const { data, error } = await supabase
    .from('preguntas_equipamento')
    .select('id, ponderado')
    .in('id', questionIds);

  if (error) throw error;

  const weights = new Map(
    ((data ?? []) as { id: string; ponderado: number | string | null }[]).map(
      item => [item.id, item.ponderado],
    ),
  );

  responses.forEach(response => {
    response.answers = response.answers.map(answer => ({
      ...answer,
      ponderado: answer.ponderado ?? weights.get(answer.pregunta_id) ?? null,
    }));
  });
}

export async function listAdminChecklistResponseFilterOptions(
  supabase: SupabaseClient,
  filters: Pick<AdminChecklistResponseFilters, 'equipamentoId'>,
): Promise<AdminChecklistResponseFilterOptions> {
  let buildingQuery = supabase
    .from('checklist_response')
    .select('building_name')
    .not('building_name', 'is', null)
    .order('building_name', { ascending: true })
    .limit(2000);

  if (filters.equipamentoId) {
    buildingQuery = buildingQuery.eq('equipamento_id', filters.equipamentoId);
  }

  const buildingResult = await buildingQuery;

  if (buildingResult.error) throw buildingResult.error;

  const buildings = Array.from(
    new Set(
      ((buildingResult.data ?? []) as { building_name: string | null }[])
        .map(item => item.building_name)
        .filter((value): value is string => !!value),
    ),
  ).map(value => ({ value, label: value }));

  return {
    buildings,
  };
}

export async function updateAdminChecklistQuestion(
  supabase: SupabaseClient,
  input: AdminChecklistQuestionUpdateInput,
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
