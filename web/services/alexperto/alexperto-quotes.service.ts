'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AlexpertoQuoteFilters } from '@/schemas/alexperto.schema';
import type {
  AlexpertoQuoteHistoryItem,
  AlexpertoQuoteListItem,
  AlexpertoQuoteNote,
} from '@/types/alexperto';

import { getAlexpertoPool } from './alexperto-db.server';
import type { AuthorizedProperty } from './alexperto-access.service';

interface QuoteRow {
  id: string;
  code: string;
  created_at: string;
  property_id: string;
  property_name: string;
  specialty_name: string;
  service: string | null;
  service_code: string | null;
  cost: string | null;
  external_status: string | null;
  creation_user_type: string | null;
  provider_name: string | null;
  requester_name: string | null;
  delay_days: number;
  total: string;
}

interface AuditActionRow {
  id: string;
  external_entity_id: string;
  current_status: AlexpertoQuoteListItem['internalStatus'];
  notes: string | null;
  auditor_comment: string | null;
  paul_comment: string | null;
  auditor_dispatch_status: AlexpertoQuoteListItem['auditorDispatchStatus'];
}

interface AuditHistoryRow {
  action_id: string;
  previous_status: AlexpertoQuoteHistoryItem['previousStatus'];
  new_status: AlexpertoQuoteHistoryItem['newStatus'];
  auditor_comment: string | null;
  paul_comment: string | null;
  created_at: string;
  created_by: string | null;
}

interface UserNameRow {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface AuditStatusRow {
  external_entity_id: string;
  current_status: AlexpertoQuoteListItem['internalStatus'];
  auditor_dispatch_status: AlexpertoQuoteListItem['auditorDispatchStatus'];
}

const SORT_COLUMNS = {
  createdAt: 'created_at',
  amount: 'cost',
  delayDays: 'delay_days',
} as const;

const ALEXPERTO_REPORT_START = '2026-01-01';
const ALEXPERTO_REPORT_END = '2027-01-01';

let cachedProviderColumn: string | null = null;
let hasCheckedProviderColumn = false;

interface InformationSchemaColumnRow {
  column_name: string;
}

async function resolveProviderColumn(client: {
  query: <T = unknown>(
    queryConfig: { text: string } | string,
  ) => Promise<{ rows: T[] }>;
}): Promise<string | null> {
  if (hasCheckedProviderColumn) return cachedProviderColumn;
  try {
    const res = await client.query<InformationSchemaColumnRow>(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'sch_main' AND table_name = 'providers'
    `);
    const cols = res.rows.map(r => String(r.column_name).toLowerCase());
    console.log('[Alexperto] Providers columns available:', cols);
    const candidates = [
      'business_name',
      'trade_name',
      'company_name',
      'legal_name',
      'name',
      'commercial_name',
      'razon_social',
      'title',
      'description',
    ];
    for (const c of candidates) {
      if (cols.includes(c)) {
        cachedProviderColumn = c;
        hasCheckedProviderColumn = true;
        return c;
      }
    }
    const fallbackCol = cols.find(
      c => !['id', 'created_at', 'updated_at', 'deleted_at'].includes(c),
    );
    cachedProviderColumn = fallbackCol || null;
    hasCheckedProviderColumn = true;
    return cachedProviderColumn;
  } catch (err) {
    console.error('[Alexperto] Error inspecting providers table:', err);
    hasCheckedProviderColumn = true;
    cachedProviderColumn = null;
    return null;
  }
}

export async function listAlexpertoQuotes(
  filters: AlexpertoQuoteFilters,
  properties: AuthorizedProperty[],
  supabase: SupabaseClient,
  onlyDispatchedToAuditor = false,
) {
  const propertyByExternalId = new Map(
    properties.map(property => [property.alexpertoPropertyId, property]),
  );
  const externalIds = properties.map(property => property.alexpertoPropertyId);
  if (!externalIds.length) {
    return {
      total: 0,
      items: [] as AlexpertoQuoteListItem[],
      specialties: [] as { value: string; label: string }[],
    };
  }
  const statusActions = await getActionsForProperties(
    supabase,
    properties.map(property => property.id),
  );
  const selectedStatusActionIds = statusActions
    .filter(action => filters.estadoInterno.includes(action.current_status))
    .map(action => action.external_entity_id);
  const allStatusActionIds = statusActions.map(
    action => action.external_entity_id,
  );
  const includesPending = filters.estadoInterno.includes('PENDIENTE_REVISION');
  const dispatchedQuoteIds = statusActions
    .filter(action => action.auditor_dispatch_status === 'ENVIADO')
    .map(action => action.external_entity_id);
  if (onlyDispatchedToAuditor && !dispatchedQuoteIds.length) {
    return {
      total: 0,
      items: [] as AlexpertoQuoteListItem[],
      specialties: [] as { value: string; label: string }[],
    };
  }

  const specialtyFilter = `AND (
    cardinality($3::text[]) = 0 OR subesp.name = ANY($3::text[])
  )`;
  const externalStatusFilter = `AND (
    cardinality($4::text[]) = 0 OR
    coalesce(up.latest_proposal_status, q.latest_quote_status) = ANY($4::text[])
  )`;
  const internalStatusFilter =
    filters.estadoInterno.length === 0
      ? ''
      : includesPending
        ? 'AND (q.id = ANY($10::text[]) OR NOT (q.id = ANY($11::text[])))'
        : 'AND q.id = ANY($10::text[])';
  const creationUserTypeFilter = `AND (
    cardinality($9::text[]) = 0 OR q.creation_user_type = ANY($9::text[])
  )`;
  const offset = (filters.page - 1) * filters.pageSize;
  const order = `${SORT_COLUMNS[filters.sort]} ${filters.direction === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;

  const values: unknown[] = [
    externalIds,
    filters.montoMinimo,
    filters.especialidades,
    filters.estadoExterno,
    filters.pageSize,
    offset,
    filters.search,
    filters.inmuebles,
    filters.creadoPor,
  ];
  if (filters.estadoInterno.length > 0) {
    values.push(selectedStatusActionIds);
    if (includesPending) values.push(allStatusActionIds);
  }
  const auditorDispatchFilter = onlyDispatchedToAuditor
    ? `AND q.id = ANY($${values.length + 1}::text[])`
    : '';
  if (onlyDispatchedToAuditor) values.push(dispatchedQuoteIds);

  const client = await getAlexpertoPool().connect();
  let result;
  try {
    await client.query('SET statement_timeout TO 30000');
    const providerCol = await resolveProviderColumn(client);

    const providerSelect = providerCol
      ? `coalesce(prov.${providerCol}, prov_assigned.${providerCol}) AS provider_name`
      : `NULL::text AS provider_name`;

    const providerJoins = providerCol
      ? `LEFT JOIN sch_main.providers prov ON prov.id = up.provider_id
         LEFT JOIN sch_main.providers prov_assigned ON prov_assigned.id = q.assigned_provider_id`
      : ``;

    const text = `WITH base AS (
       SELECT q.id, q.code, q.created_at, q.property_id, prop.name AS property_name,
          coalesce(subesp.name, 'Sin especialidad') AS specialty_name,
          coalesce(req.description, q.description) AS service,
         req.code AS service_code, up.cost, coalesce(up.latest_proposal_status, q.latest_quote_status) AS external_status,
         q.creation_user_type,
         ${providerSelect},
         coalesce(req.code, q.description) AS requester_name,
         CASE WHEN lower(coalesce(q.latest_quote_status, '')) IN ('approved','completed','complete','closed','cancelled','canceled','resolved','rejected') THEN 0 ELSE greatest(0, current_date - q.created_at::date) END AS delay_days
       FROM sch_main.quotes q
       INNER JOIN sch_main.properties prop ON prop.id = q.property_id AND prop.deleted_at IS NULL
       LEFT JOIN sch_main.sub_specialties subesp ON subesp.id = q.sub_specialty_id
       LEFT JOIN sch_main.requests req ON req.id = coalesce(q.generated_request_id, q.trigger_request_id)
       LEFT JOIN LATERAL (
         SELECT p.cost, p.latest_proposal_status, p.provider_id
         FROM sch_main.proposals p
         WHERE p.quote_id = q.id
         ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
         LIMIT 1
       ) up ON true
       ${providerJoins}
        WHERE q.property_id = ANY($1::text[])
          AND q.created_at >= '${ALEXPERTO_REPORT_START}'::date
          AND q.created_at < '${ALEXPERTO_REPORT_END}'::date
          AND coalesce(up.cost, 0) >= $2
          AND ($7 = '' OR q.code ILIKE '%' || $7 || '%' OR prop.name ILIKE '%' || $7 || '%' OR coalesce(q.description, '') ILIKE '%' || $7 || '%')
          AND (cardinality($8::text[]) = 0 OR prop.name = ANY($8::text[]))
           ${specialtyFilter} ${externalStatusFilter} ${creationUserTypeFilter} ${internalStatusFilter} ${auditorDispatchFilter}
    )
    SELECT *, count(*) OVER() AS total FROM base
    ORDER BY ${order} LIMIT $5 OFFSET $6`;

    result = await client.query<QuoteRow>({ text, values });
  } finally {
    client.release();
  }
  const ids = result.rows.map(row => String(row.id));
  const actions = await getActions(supabase, ids);
  const actionById = new Map(
    actions.map(action => [action.external_entity_id, action]),
  );
  const historyByActionId = await getActionHistory(
    supabase,
    actions.map(action => action.id),
  );
  const internalStatuses = new Set(filters.estadoInterno);

  return {
    total: Number(result.rows[0]?.total ?? 0),
    items: result.rows
      .filter(row => {
        if (!internalStatuses.size) return true;
        return internalStatuses.has(
          actionById.get(String(row.id))?.current_status ??
            'PENDIENTE_REVISION',
        );
      })
      .map(row => {
        const property = propertyByExternalId.get(String(row.property_id));
        const action = actionById.get(String(row.id));
        return {
          externalQuoteId: String(row.id),
          code: String(row.code),
          createdAt: new Date(row.created_at).toISOString(),
          property: {
            id: String(row.property_id),
            name: String(row.property_name),
            gemaPropertyId: property!.id,
          },
          specialty: {
            name: String(row.specialty_name),
            code: String(row.specialty_name),
          },
          service: row.service ? String(row.service) : null,
          serviceCode: row.service_code ? String(row.service_code) : null,
          amount: row.cost === null ? null : String(row.cost),
          externalStatus: row.external_status
            ? String(row.external_status)
            : null,
          creationUserType: row.creation_user_type
            ? String(row.creation_user_type)
            : null,
          providerName: row.provider_name ? String(row.provider_name) : null,
          requesterName: row.requester_name ? String(row.requester_name) : null,
          delayDays: Number(row.delay_days),
          internalStatus: action?.current_status ?? 'PENDIENTE_REVISION',
          internalComment: action?.notes ?? null,
          auditorComment: action?.auditor_comment ?? action?.notes ?? null,
          paulComment: action?.paul_comment ?? null,
          history: action ? (historyByActionId.get(action.id) ?? []) : [],
          notes: [],
          responsible: null,
          auditorDispatchStatus:
            action?.auditor_dispatch_status ?? 'PENDIENTE_ENVIO',
        } satisfies AlexpertoQuoteListItem;
      }),
    specialties: await listAlexpertoQuoteSpecialties(externalIds),
  };
}

export async function findAuthorizedQuoteProperty(
  externalQuoteId: string,
  properties: AuthorizedProperty[],
) {
  const externalIds = properties.map(property => property.alexpertoPropertyId);
  if (!externalIds.length) return null;

  const { rows } = await getAlexpertoPool().query<{ property_id: string }>({
    text: `
      SELECT property_id
      FROM sch_main.quotes
      WHERE id = $1 AND property_id = ANY($2::text[])
      LIMIT 1
    `,
    values: [externalQuoteId, externalIds],
  });
  const externalPropertyId = rows[0]?.property_id;
  if (!externalPropertyId) return null;

  return (
    properties.find(
      property => property.alexpertoPropertyId === externalPropertyId,
    ) ?? null
  );
}

async function getActions(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('alexperto_audit_actions')
    .select(
      'id, external_entity_id, current_status, notes, auditor_comment, paul_comment, auditor_dispatch_status',
    )
    .eq('external_entity_type', 'QUOTE')
    .in('external_entity_id', ids);
  if (error) throw error;
  return (data ?? []) as AuditActionRow[];
}

async function getActionHistory(supabase: SupabaseClient, actionIds: string[]) {
  if (!actionIds.length) return new Map<string, AlexpertoQuoteHistoryItem[]>();

  const { data: history, error: historyError } = await supabase
    .from('alexperto_audit_action_history')
    .select(
      'action_id, previous_status, new_status, auditor_comment, paul_comment, created_at, created_by',
    )
    .in('action_id', actionIds)
    .order('created_at', { ascending: false });
  if (historyError) throw historyError;

  const rows = (history ?? []) as AuditHistoryRow[];
  const userIds = Array.from(
    new Set(rows.flatMap(row => (row.created_by ? [row.created_by] : []))),
  );
  const usersById = new Map<string, UserNameRow>();
  if (userIds.length) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, email')
      .in('id', userIds);
    if (usersError) throw usersError;
    for (const user of (users ?? []) as UserNameRow[])
      usersById.set(user.id, user);
  }

  const historyByActionId = new Map<string, AlexpertoQuoteHistoryItem[]>();
  for (const row of rows) {
    const user = row.created_by ? usersById.get(row.created_by) : null;
    const name = user
      ? [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.username ||
        user.email
      : null;
    const entries = historyByActionId.get(row.action_id) ?? [];
    entries.push({
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      auditorComment: row.auditor_comment,
      paulComment: row.paul_comment,
      createdAt: row.created_at,
      createdBy: row.created_by ? { id: row.created_by, name } : null,
    });
    historyByActionId.set(row.action_id, entries);
  }
  return historyByActionId;
}

async function getActionsForProperties(
  supabase: SupabaseClient,
  propertyIds: string[],
) {
  const { data, error } = await supabase
    .from('alexperto_audit_actions')
    .select('external_entity_id, current_status, auditor_dispatch_status')
    .eq('external_entity_type', 'QUOTE')
    .in('gema_property_id', propertyIds);
  if (error) throw error;
  return (data ?? []) as AuditStatusRow[];
}

let specialtiesCache: { value: string; label: string }[] | null = null;
let specialtiesCacheExpiry = 0;
const SPECIALTIES_CACHE_TTL = 30 * 60 * 1000; // 30 minutos

async function listAlexpertoQuoteSpecialties(externalPropertyIds: string[]) {
  const now = Date.now();
  if (specialtiesCache && now < specialtiesCacheExpiry) {
    return specialtiesCache;
  }
  try {
    const { rows } = await getAlexpertoPool().query<{ name: string }>({
      text: `
        SELECT DISTINCT trim(subesp.name) AS name
        FROM sch_main.quotes q
        INNER JOIN sch_main.sub_specialties subesp ON subesp.id = q.sub_specialty_id
        WHERE q.property_id = ANY($1::text[])
          AND q.created_at >= '${ALEXPERTO_REPORT_START}'::date
          AND q.created_at < '${ALEXPERTO_REPORT_END}'::date
          AND trim(subesp.name) <> ''
        ORDER BY name
      `,
      values: [externalPropertyIds],
    });
    specialtiesCache = rows.map(row => ({ value: row.name, label: row.name }));
    specialtiesCacheExpiry = now + SPECIALTIES_CACHE_TTL;
    return specialtiesCache;
  } catch (error) {
    console.error('Error fetching specialties:', error);
    return specialtiesCache ?? [];
  }
}

interface QuoteNoteRow {
  id: string;
  quote_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
}

export async function getAlexpertoQuoteNotes(
  quoteId: string,
): Promise<AlexpertoQuoteNote[]> {
  if (!quoteId) return [];
  const { rows } = await getAlexpertoPool().query<QuoteNoteRow>({
    text: `
      SELECT qn.id, qn.quote_id, qn.content, qn.created_at,
             concat_ws(' ', trim(u.first_name), trim(u.last_name)) AS author_name,
             u.email AS author_email
      FROM sch_main.quote_notes qn
      LEFT JOIN sch_main.users u ON u.id = qn.creator_id
      WHERE qn.quote_id = $1
      ORDER BY qn.created_at DESC
    `,
    values: [quoteId],
  });

  return rows.map(row => ({
    id: String(row.id),
    content: String(row.content ?? ''),
    createdAt: new Date(row.created_at).toISOString(),
    authorName: row.author_name?.trim() || null,
    authorEmail: row.author_email?.trim() || null,
  }));
}
