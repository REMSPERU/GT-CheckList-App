import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminChecklistQuestionRow,
  AdminChecklistQuestionUpdateInput,
  AdminChecklistResponseFilters,
  AdminChecklistResponseRow,
  AdminPaginatedResult,
} from '@/types/admin';

import {
  type ChecklistQuestionQueryRow,
  type ChecklistResponseQueryRow,
} from './admin-query-helpers';
import { listAdminEquipmentTypes } from './equipment-types.service';

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
        evidencia_general_fotos,
        respuestas_json
      `,
      { count: 'exact' },
    )
    .order('submitted_at', { ascending: false });

  if (filters.equipamentoId) {
    query = query.eq('equipamento_id', filters.equipamentoId);
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
        evidencia_general_fotos,
        respuestas_json
      `,
    )
    .eq('id', responseId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const response = mapChecklistResponse(data as ChecklistResponseQueryRow);
  await hydrateAnswerWeights(supabase, [response]);
  return response;
}

function mapChecklistResponse(
  item: ChecklistResponseQueryRow,
): AdminChecklistResponseRow {
  return {
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
