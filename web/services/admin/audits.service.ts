import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminAuditAnswerItem,
  AdminAuditEquipmentFeedbackItem,
  AdminAuditPhotoRef,
  AdminAuditSessionFilters,
  AdminAuditSessionRow,
  AdminPaginatedResult,
} from '@/types/admin';

interface AuditSessionQueryRow {
  id: string;
  client_submission_id: string;
  property_id: string;
  auditor_id: string;
  scheduled_for: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  audit_payload: unknown;
  summary: unknown;
  created_at: string | null;
}

interface PropertyNameRow {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
}

interface UserNameRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface AuditQuestionNameRow {
  id: string;
  question_text: string;
  section?:
    | { section_name: string | null }
    | { section_name: string | null }[]
    | null;
  equipment_name: string | null;
}

interface AuditPayloadAnswer {
  question_id?: unknown;
  status?: unknown;
  comment?: unknown;
  photos?: unknown;
}

interface AuditPayloadFeedback {
  equipment_key?: unknown;
  equipment_label?: unknown;
  good_practices_comment?: unknown;
  good_practices_photos?: unknown;
  improvement_opportunity_comment?: unknown;
  improvement_opportunity_photos?: unknown;
}

interface AuditPayload {
  answers?: unknown;
  equipment_feedback?: unknown;
}

interface AuditSummary {
  total_questions?: unknown;
  total_applies?: unknown;
  total_not_applicable?: unknown;
  total_ok?: unknown;
  total_obs?: unknown;
  total_photos?: unknown;
}

const DEFAULT_AUDITORIA_STATUS = 'SINCRONIZADA';

export async function listAdminAuditSessions(
  supabase: SupabaseClient,
  filters: AdminAuditSessionFilters,
): Promise<AdminPaginatedResult<AdminAuditSessionRow>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from('audit_sessions')
    .select(
      `
        id,
        client_submission_id,
        property_id,
        auditor_id,
        scheduled_for,
        status,
        started_at,
        submitted_at,
        audit_payload,
        summary,
        created_at,
        properties!inner(id)
      `,
      { count: 'exact' },
    )
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filters.propertyId) query = query.eq('property_id', filters.propertyId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as AuditSessionQueryRow[];
  const mappedRows = await hydrateAuditRows(supabase, rows);
  const search = filters.search?.trim().toLowerCase();

  return {
    items: search
      ? mappedRows.filter(item =>
          [item.propertyName, item.propertyCode, item.auditorName, item.status]
            .filter(Boolean)
            .some(value => value!.toLowerCase().includes(search)),
        )
      : mappedRows,
    total: count ?? 0,
  };
}

export interface AuditAnswerPatch {
  question_id: string;
  status: 'OK' | 'OBS';
  comment: string | null;
  new_photos?: { bucket: string; path: string; public_url?: string }[];
  kept_existing_photo_urls?: string[];
}

/**
 * Updates specific answers inside the audit_payload JSONB column.
 * Merges patches by question_id, preserving all other payload fields.
 */
export async function updateAdminAuditAnswers(
  supabase: SupabaseClient,
  sessionId: string,
  patches: AuditAnswerPatch[],
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('audit_sessions')
    .select('audit_payload')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;

  const payload = isRecord(data?.audit_payload)
    ? (data.audit_payload as AuditPayload & { answers?: AuditPayloadAnswer[] })
    : {};

  const currentAnswers = Array.isArray(payload.answers)
    ? [...(payload.answers as AuditPayloadAnswer[])]
    : [];

  const patchMap = new Map(patches.map(p => [p.question_id, p]));

  const updatedAnswers = currentAnswers.map(answer => {
    const id = asString(answer.question_id);
    const patch = id ? patchMap.get(id) : undefined;
    if (!patch) return answer;

    let currentPhotos = Array.isArray(answer.photos) ? answer.photos : [];

    if (patch.kept_existing_photo_urls) {
      currentPhotos = currentPhotos.filter(photo => {
        const photoObj = photo as Record<string, unknown>;

        // Photos from the mobile app only store { path, bucket } without a
        // pre-computed public URL. Resolve the public URL the same way
        // mapPhotoRefs() does so the comparison is consistent.
        const directUrl =
          asString(photoObj.publicUrl) ??
          asString(photoObj.public_url) ??
          asString(photoObj.url);

        if (directUrl) {
          return patch.kept_existing_photo_urls!.includes(directUrl);
        }

        // Fallback: derive public URL from path + bucket
        const path = asString(photoObj.path);
        if (!path) return false;
        const bucket = asString(photoObj.bucket) ?? 'maintenance';
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return patch.kept_existing_photo_urls!.includes(data.publicUrl);
      });
    }

    const mergedPhotos =
      patch.new_photos && patch.new_photos.length > 0
        ? [...currentPhotos, ...patch.new_photos]
        : currentPhotos;

    return {
      ...answer,
      status: patch.status,
      comment: patch.comment,
      photos: mergedPhotos,
    };
  });

  const updatedPayload = { ...payload, answers: updatedAnswers };

  const { error: updateError } = await supabase
    .from('audit_sessions')
    .update({ audit_payload: updatedPayload })
    .eq('id', sessionId);

  if (updateError) throw updateError;
}

export interface AuditFeedbackPatch {
  equipment_key: string;
  good_practices_comment: string | null;
  good_practices_new_photos?: { bucket: string; path: string; public_url?: string }[];
  good_practices_kept_existing_photo_urls?: string[];
  improvement_opportunity_comment: string | null;
  improvement_opportunity_new_photos?: { bucket: string; path: string; public_url?: string }[];
  improvement_opportunity_kept_existing_photo_urls?: string[];
}

/**
 * Updates the comment and photo fields of a single equipment_feedback entry inside audit_payload.
 * Matched by equipment_key.
 */
export async function updateAdminAuditFeedback(
  supabase: SupabaseClient,
  sessionId: string,
  patch: AuditFeedbackPatch,
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('audit_sessions')
    .select('audit_payload')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;

  const payload = isRecord(data?.audit_payload)
    ? (data.audit_payload as AuditPayload & {
        equipment_feedback?: AuditPayloadFeedback[];
      })
    : {};

  const currentFeedback = Array.isArray(payload.equipment_feedback)
    ? [...(payload.equipment_feedback as AuditPayloadFeedback[])]
    : [];

  const updatedFeedback = currentFeedback.map(item => {
    const key = asString(item.equipment_key);
    if (key !== patch.equipment_key) return item;

    // Good practices photos update
    let currentGpPhotos = Array.isArray(item.good_practices_photos)
      ? item.good_practices_photos
      : [];

    if (patch.good_practices_kept_existing_photo_urls) {
      currentGpPhotos = currentGpPhotos.filter(photo => {
        const photoObj = photo as Record<string, unknown>;
        const directUrl =
          asString(photoObj.publicUrl) ??
          asString(photoObj.public_url) ??
          asString(photoObj.url);

        if (directUrl) {
          return patch.good_practices_kept_existing_photo_urls!.includes(directUrl);
        }

        const path = asString(photoObj.path);
        if (!path) return false;
        const bucket = asString(photoObj.bucket) ?? 'maintenance';
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return patch.good_practices_kept_existing_photo_urls!.includes(data.publicUrl);
      });
    }

    const mergedGpPhotos =
      patch.good_practices_new_photos && patch.good_practices_new_photos.length > 0
        ? [...currentGpPhotos, ...patch.good_practices_new_photos]
        : currentGpPhotos;

    // Improvement opportunity photos update
    let currentOppPhotos = Array.isArray(item.improvement_opportunity_photos)
      ? item.improvement_opportunity_photos
      : [];

    if (patch.improvement_opportunity_kept_existing_photo_urls) {
      currentOppPhotos = currentOppPhotos.filter(photo => {
        const photoObj = photo as Record<string, unknown>;
        const directUrl =
          asString(photoObj.publicUrl) ??
          asString(photoObj.public_url) ??
          asString(photoObj.url);

        if (directUrl) {
          return patch.improvement_opportunity_kept_existing_photo_urls!.includes(directUrl);
        }

        const path = asString(photoObj.path);
        if (!path) return false;
        const bucket = asString(photoObj.bucket) ?? 'maintenance';
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return patch.improvement_opportunity_kept_existing_photo_urls!.includes(data.publicUrl);
      });
    }

    const mergedOppPhotos =
      patch.improvement_opportunity_new_photos && patch.improvement_opportunity_new_photos.length > 0
        ? [...currentOppPhotos, ...patch.improvement_opportunity_new_photos]
        : currentOppPhotos;

    return {
      ...item,
      good_practices_comment: patch.good_practices_comment,
      good_practices_photos: mergedGpPhotos,
      improvement_opportunity_comment: patch.improvement_opportunity_comment,
      improvement_opportunity_photos: mergedOppPhotos,
    };
  });

  const updatedPayload = { ...payload, equipment_feedback: updatedFeedback };

  const { error: updateError } = await supabase
    .from('audit_sessions')
    .update({ audit_payload: updatedPayload })
    .eq('id', sessionId);

  if (updateError) throw updateError;
}

export async function getAdminAuditSessionById(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<AdminAuditSessionRow | null> {
  const { data, error } = await supabase
    .from('audit_sessions')
    .select(
      `
        id,
        client_submission_id,
        property_id,
        auditor_id,
        scheduled_for,
        status,
        started_at,
        submitted_at,
        audit_payload,
        summary,
        created_at,
        properties!inner(id)
      `,
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const sessionRow = data as AuditSessionQueryRow;

  const [session] = await hydrateAuditRows(supabase, [sessionRow]);

  return session ?? null;
}

async function hydrateAuditRows(
  supabase: SupabaseClient,
  rows: AuditSessionQueryRow[],
): Promise<AdminAuditSessionRow[]> {
  const propertyIds = unique(rows.map(item => item.property_id));
  const auditorIds = unique(rows.map(item => item.auditor_id));
  const questionIds = unique(
    rows.flatMap(item =>
      getPayloadAnswers(item.audit_payload)
        .map(answer => asString(answer.question_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [properties, users, questions] = await Promise.all([
    fetchPropertiesById(supabase, propertyIds),
    fetchUsersById(supabase, auditorIds),
    fetchQuestionsById(supabase, questionIds),
  ]);

  return rows.map(item => {
    const summary = asSummary(item.summary);
    const property = properties.get(item.property_id);
    const auditor = users.get(item.auditor_id);

    const answers = mapAuditAnswers(item.audit_payload, questions, supabase);
    const equipmentFeedback = mapEquipmentFeedback(item.audit_payload, supabase);

    let feedbackOk = 0;
    let feedbackObs = 0;
    let feedbackPhotos = 0;

    equipmentFeedback.forEach(fb => {
      const gpComment = fb.good_practices_comment?.trim();
      const gpPhotos = fb.good_practices_photos?.length ?? 0;
      const oppComment = fb.improvement_opportunity_comment?.trim();
      const oppPhotos = fb.improvement_opportunity_photos?.length ?? 0;

      if (gpComment || gpPhotos > 0) {
        feedbackOk += 1;
        feedbackPhotos += gpPhotos;
      }
      if (oppComment || oppPhotos > 0) {
        feedbackObs += 1;
        feedbackPhotos += oppPhotos;
      }
    });

    const computedTotalOk = answers.filter(a => a.status === 'OK').length + feedbackOk;
    const computedTotalObs = answers.filter(a => a.status === 'OBS').length + feedbackObs;
    const computedTotalPhotos = answers.reduce((sum, a) => sum + a.photos.length, 0) + feedbackPhotos;

    return {
      id: item.id,
      client_submission_id: item.client_submission_id,
      property_id: item.property_id,
      propertyName: property?.name ?? 'Inmueble sin nombre',
      propertyCode: property?.code ?? null,
      propertyAddress: property?.address ?? null,
      auditor_id: item.auditor_id,
      auditorName: auditor ? formatUserName(auditor) : item.auditor_id,
      scheduled_for: item.scheduled_for,
      status: item.status ?? DEFAULT_AUDITORIA_STATUS,
      started_at: item.started_at,
      submitted_at: item.submitted_at,
      created_at: item.created_at,
      total_questions: asNumber(summary.total_questions),
      total_applies: asNumber(summary.total_applies),
      total_not_applicable: asNumber(summary.total_not_applicable),
      total_ok: computedTotalOk,
      total_obs: computedTotalObs,
      total_photos: computedTotalPhotos,
      answers,
      equipmentFeedback,
    };
  });
}

async function fetchPropertiesById(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, PropertyNameRow>();

  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, address')
    .in('id', ids);

  if (error) throw error;
  return new Map(
    ((data ?? []) as PropertyNameRow[]).map(item => [item.id, item]),
  );
}

async function fetchUsersById(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, UserNameRow>();

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .in('id', ids);

  if (error) throw error;
  return new Map(((data ?? []) as UserNameRow[]).map(item => [item.id, item]));
}

async function fetchQuestionsById(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, AuditQuestionNameRow>();

  const { data, error } = await supabase
    .from('audit_questions')
    .select(
      'id, question_text, equipment_name, section:audit_question_sections(section_name)',
    )
    .in('id', ids);

  if (error) throw error;
  return new Map(
    ((data ?? []) as AuditQuestionNameRow[]).map(item => [item.id, item]),
  );
}

function mapAuditAnswers(
  payloadValue: unknown,
  questions: Map<string, AuditQuestionNameRow>,
  supabase: SupabaseClient,
): AdminAuditAnswerItem[] {
  return getPayloadAnswers(payloadValue)
    .map(answer => {
      const questionId = asString(answer.question_id);
      const status: 'OK' | 'OBS' = answer.status === 'OK' ? 'OK' : 'OBS';
      const question = questionId ? questions.get(questionId) : undefined;

      return {
        question_id: questionId ?? '',
        questionText: question?.question_text ?? 'Pregunta sin texto',
        sectionName: getQuestionSectionName(question),
        equipmentName: question?.equipment_name ?? null,
        status,
        comment: asString(answer.comment),
        photos: mapPhotoRefs(answer.photos, supabase),
      };
    })
    .filter(answer => answer.question_id);
}

function mapEquipmentFeedback(
  payloadValue: unknown,
  supabase: SupabaseClient,
): AdminAuditEquipmentFeedbackItem[] {
  const payload = asPayload(payloadValue);
  const feedback = Array.isArray(payload.equipment_feedback)
    ? (payload.equipment_feedback as AuditPayloadFeedback[])
    : [];

  return feedback.map(item => ({
    equipment_key: asString(item.equipment_key) ?? '',
    equipment_label: asString(item.equipment_label) ?? 'Activo',
    good_practices_comment: asString(item.good_practices_comment),
    good_practices_photos: mapPhotoRefs(item.good_practices_photos, supabase),
    improvement_opportunity_comment: asString(
      item.improvement_opportunity_comment,
    ),
    improvement_opportunity_photos: mapPhotoRefs(
      item.improvement_opportunity_photos,
      supabase,
    ),
  }));
}

function getQuestionSectionName(question?: AuditQuestionNameRow) {
  if (!question?.section) return null;
  if (Array.isArray(question.section)) {
    return question.section[0]?.section_name ?? null;
  }

  return question.section.section_name ?? null;
}

function mapPhotoRefs(
  value: unknown,
  supabase: SupabaseClient,
): AdminAuditPhotoRef[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map(item => {
      const bucket = asString(item.bucket) ?? 'maintenance';
      const path = asString(item.path);
      const publicUrl =
        asString(item.publicUrl) ??
        asString(item.public_url) ??
        asString(item.url);

      if (publicUrl || !path) {
        return { bucket, path, publicUrl };
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { bucket, path, publicUrl: data.publicUrl };
    });
}

function getPayloadAnswers(value: unknown): AuditPayloadAnswer[] {
  const payload = asPayload(value);
  return Array.isArray(payload.answers)
    ? (payload.answers as AuditPayloadAnswer[])
    : [];
}

function asPayload(value: unknown): AuditPayload {
  return isRecord(value) ? (value as AuditPayload) : {};
}

function asSummary(value: unknown): AuditSummary {
  return isRecord(value) ? (value as AuditSummary) : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatUserName(user: UserNameRow) {
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || user.email || user.id;
}
