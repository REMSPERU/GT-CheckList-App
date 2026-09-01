'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AlexpertoRequestFilters } from '@/schemas/alexperto.schema';
import type {
  AlexpertoRequestHistoryItem,
  AlexpertoRequestListItem,
  AlexpertoSpecialtyCode,
} from '@/types/alexperto';

import { getAlexpertoPool } from './alexperto-db.server';
import type { AuthorizedProperty } from './alexperto-access.service';

interface RequestRow {
  id: string;
  code: string;
  created_at: string;
  start_time: string | null;
  property_id: string;
  property_name: string;
  specialty_name: string | null;
  description: string | null;
  request_type: string | null;
  external_status: string | null;
  quote_count: string;
  attachment_count: string;
  total: string;
}

interface SummaryRequestRow {
  id: string;
  external_status: string | null;
}

interface AuditActionRow {
  id: string;
  external_entity_id: string;
  current_status: AlexpertoRequestListItem['internalStatus'];
  gema_property_id: string;
}

interface AuditHistoryRow {
  action_id: string;
  previous_status: AlexpertoRequestHistoryItem['previousStatus'];
  new_status: AlexpertoRequestHistoryItem['newStatus'];
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

const SORT_COLUMNS = {
  startTime: 'start_time',
  createdAt: 'created_at',
} as const;

const SPECIALTY_CASE = `CASE lower(trim(subesp.name))
  WHEN 'sistema de aire acondicionado' THEN 'AA'
  WHEN 'equipos de ventilación mecánica' THEN 'VM'
  WHEN 'sistemas contra incendio' THEN 'SCI'
  WHEN 'tableros eléctricos' THEN 'TE'
  WHEN 'grupos electrógenos' THEN 'GE'
  WHEN 'bombas de agua y desagüe' THEN 'BOM'
  WHEN 'sistemas de seguridad y control' THEN 'SSC'
  WHEN 'sub estación eléctrica' THEN 'SEE'
  WHEN 'tableros de transferencia | distribución | otros relacionados' THEN 'TTA'
  WHEN 'ascensores' THEN 'ASC'
END`;

export async function listAlexpertoRequests(
  filters: AlexpertoRequestFilters,
  properties: AuthorizedProperty[],
  supabase: SupabaseClient,
) {
  const propertyByExternalId = new Map(
    properties.map(property => [property.alexpertoPropertyId, property]),
  );
  const externalIds = properties.map(property => property.alexpertoPropertyId);
  if (!externalIds.length)
    return {
      total: 0,
      items: [] as AlexpertoRequestListItem[],
      summary: { externalStatuses: {}, gemaStatuses: {} },
    };

  const offset = (filters.page - 1) * filters.pageSize;
  const order = `${SORT_COLUMNS[filters.sort]} ${filters.direction === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
  const values: unknown[] = [
    externalIds,
    filters.requestTypes,
    filters.especialidades,
    filters.estadoExterno,
    filters.search,
    filters.inmuebles,
    filters.fechaDesde ?? null,
    filters.fechaHasta ?? null,
    filters.pageSize,
    offset,
  ];
  const listQuery = {
    text: `WITH base AS (
         SELECT r.id, r.code, r.created_at, r.start_time, r.property_id,
           prop.name AS property_name, subesp.name AS specialty_name,
           r.description, r.request_type, r.latest_request_status AS external_status
         FROM sch_main.requests r
         INNER JOIN sch_main.properties prop ON prop.id = r.property_id AND prop.deleted_at IS NULL
         LEFT JOIN sch_main.sub_specialties subesp ON subesp.id = r.sub_speciality_id
         WHERE r.property_id = ANY($1::text[]) AND r.deleted_at IS NULL
           AND (cardinality($2::text[]) = 0 OR r.request_type = ANY($2::text[]))
           AND (cardinality($3::text[]) = 0 OR ${SPECIALTY_CASE} = ANY($3::text[]))
           AND (cardinality($4::text[]) = 0 OR r.latest_request_status = ANY($4::text[]))
           AND ($5 = '' OR r.code ILIKE '%' || $5 || '%' OR prop.name ILIKE '%' || $5 || '%' OR coalesce(r.description, '') ILIKE '%' || $5 || '%')
           AND (cardinality($6::text[]) = 0 OR prop.name = ANY($6::text[]))
           AND ($7::date IS NULL OR r.start_time >= $7::date)
           AND ($8::date IS NULL OR r.start_time < ($8::date + INTERVAL '1 day'))
       ), paged AS (
         SELECT *, count(*) OVER() AS total
         FROM base
         ORDER BY ${order}, id DESC
         LIMIT $9 OFFSET $10
       ), related_quotes AS (
         SELECT q.id AS quote_id, q.generated_request_id AS request_id
         FROM sch_main.quotes q
         INNER JOIN paged p ON p.id = q.generated_request_id
         WHERE q.generated_request_id IS NOT NULL
         UNION
         SELECT q.id AS quote_id, q.trigger_request_id AS request_id
         FROM sch_main.quotes q
         INNER JOIN paged p ON p.id = q.trigger_request_id
         WHERE q.trigger_request_id IS NOT NULL
       ), quote_counts AS (
         SELECT request_id, count(*)::text AS quote_count
         FROM related_quotes
         GROUP BY request_id
       ), all_attachments AS (
         SELECT d.request_id, d.id AS document_id
         FROM sch_main.request_documents d
         INNER JOIN paged p ON p.id = d.request_id
         WHERE d.deleted_at IS NULL
         UNION ALL
         SELECT rq.request_id, d.id AS document_id
         FROM related_quotes rq
         INNER JOIN sch_main.quote_documents d ON d.quote_id = rq.quote_id
         WHERE d.deleted_at IS NULL
         UNION ALL
         SELECT rq.request_id, d.id AS document_id
         FROM related_quotes rq
         INNER JOIN sch_main.proposals p ON p.quote_id = rq.quote_id
         INNER JOIN sch_main.proposal_documents d ON d.proposal_id = p.id
         WHERE d.deleted_at IS NULL
       ), attachment_counts AS (
         SELECT request_id, count(*)::text AS attachment_count
         FROM all_attachments
         GROUP BY request_id
       )
       SELECT p.*, coalesce(qc.quote_count, '0') AS quote_count,
         coalesce(ac.attachment_count, '0') AS attachment_count
       FROM paged p
       LEFT JOIN quote_counts qc ON qc.request_id = p.id
       LEFT JOIN attachment_counts ac ON ac.request_id = p.id
       ORDER BY ${order}, p.id DESC`,
    values,
  };
  const summaryQuery = {
    text: `
        SELECT r.id, r.latest_request_status AS external_status
        FROM sch_main.requests r
        INNER JOIN sch_main.properties prop ON prop.id = r.property_id AND prop.deleted_at IS NULL
        LEFT JOIN sch_main.sub_specialties subesp ON subesp.id = r.sub_speciality_id
        WHERE r.property_id = ANY($1::text[]) AND r.deleted_at IS NULL
          AND (cardinality($2::text[]) = 0 OR r.request_type = ANY($2::text[]))
          AND (cardinality($3::text[]) = 0 OR ${SPECIALTY_CASE} = ANY($3::text[]))
          AND (cardinality($4::text[]) = 0 OR r.latest_request_status = ANY($4::text[]))
          AND ($5 = '' OR r.code ILIKE '%' || $5 || '%' OR prop.name ILIKE '%' || $5 || '%' OR coalesce(r.description, '') ILIKE '%' || $5 || '%')
          AND (cardinality($6::text[]) = 0 OR prop.name = ANY($6::text[]))
          AND ($7::date IS NULL OR r.start_time >= $7::date)
          AND ($8::date IS NULL OR r.start_time < ($8::date + INTERVAL '1 day'))
      `,
    values: values.slice(0, 8),
  };
  const [listClient, summaryClient] = await Promise.all([
    getAlexpertoPool().connect(),
    getAlexpertoPool().connect(),
  ]);
  let result: { rows: RequestRow[] };
  let summaryResult: { rows: SummaryRequestRow[] };
  try {
    await Promise.all([
      listClient.query('SET statement_timeout TO 30000'),
      summaryClient.query('SET statement_timeout TO 30000'),
    ]);
    [result, summaryResult] = await Promise.all([
      listClient.query<RequestRow>(listQuery),
      summaryClient.query<SummaryRequestRow>(summaryQuery),
    ]);
  } finally {
    listClient.release();
    summaryClient.release();
  }
  const ids = result.rows.map(row => row.id);
  const summaryRows = summaryResult.rows;
  const { data: actionData, error: actionError } = await supabase
    .from('alexperto_audit_actions')
    .select('id, external_entity_id, current_status, gema_property_id')
    .eq('external_entity_type', 'REQUEST')
    .in(
      'gema_property_id',
      properties.map(property => property.id),
    );
  if (actionError) throw actionError;
  const actions = (actionData ?? []) as AuditActionRow[];
  const actionsByExternalId = new Map(
    actions.map(action => [action.external_entity_id, action]),
  );
  const pageActions = actions.filter(action =>
    ids.includes(action.external_entity_id),
  );
  const historyByActionId = await getActionHistory(
    supabase,
    pageActions.map(action => action.id),
  );
  const externalStatusCounts: Record<string, number> = {};
  const gemaStatusCounts: Record<string, number> = {};
  for (const row of summaryRows) {
    const internalStatus =
      actionsByExternalId.get(row.id)?.current_status ?? 'PENDIENTE_REVISION';
    if (
      filters.estadoInterno.length > 0 &&
      !filters.estadoInterno.includes(internalStatus)
    ) {
      continue;
    }
    const externalStatus = row.external_status ?? 'SIN_ESTADO';
    externalStatusCounts[externalStatus] =
      (externalStatusCounts[externalStatus] ?? 0) + 1;
    gemaStatusCounts[internalStatus] =
      (gemaStatusCounts[internalStatus] ?? 0) + 1;
  }
  return {
    total: Number(result.rows[0]?.total ?? 0),
    summary: {
      externalStatuses: externalStatusCounts,
      gemaStatuses: gemaStatusCounts,
    },
    items: result.rows
      .map(row => {
        const property = propertyByExternalId.get(row.property_id);
        if (!property) return null;
        const code = specialtyCode(row.specialty_name);
        return {
          externalRequestId: row.id,
          code: row.code,
          createdAt: new Date(row.created_at).toISOString(),
          startTime: row.start_time
            ? new Date(row.start_time).toISOString()
            : null,
          property: {
            id: row.property_id,
            name: row.property_name,
            gemaPropertyId: property.id,
          },
          specialty: row.specialty_name
            ? { name: row.specialty_name, code: code ?? 'OTHER' }
            : null,
          description: row.description,
          requestType: row.request_type,
          externalStatus: row.external_status,
          quoteCount: Number(row.quote_count),
          attachmentCount: Number(row.attachment_count),
          internalStatus:
            actionsByExternalId.get(row.id)?.current_status ??
            'PENDIENTE_REVISION',
          history:
            historyByActionId.get(actionsByExternalId.get(row.id)?.id ?? '') ??
            [],
        } satisfies AlexpertoRequestListItem;
      })
      .filter((item): item is AlexpertoRequestListItem => item !== null)
      .filter(
        item =>
          filters.estadoInterno.length === 0 ||
          filters.estadoInterno.includes(item.internalStatus),
      ),
  };
}

export async function getAlexpertoRequestByCode(
  code: string,
  properties: AuthorizedProperty[],
  supabase: SupabaseClient,
) {
  const normalizedCode = code.trim();
  const { rows } = await getAlexpertoPool().query<RequestRow>({
    text: `SELECT r.id, r.code, r.created_at, r.start_time, r.property_id,
      prop.name AS property_name, subesp.name AS specialty_name, r.description,
      r.request_type, r.latest_request_status AS external_status,
      (SELECT count(*)::text FROM sch_main.quotes q
       WHERE q.generated_request_id = r.id OR q.trigger_request_id = r.id) AS quote_count,
      ((SELECT count(*) FROM sch_main.request_documents d
       WHERE d.request_id = r.id AND d.deleted_at IS NULL) +
      (SELECT count(*) FROM sch_main.quote_documents qd
       INNER JOIN sch_main.quotes q ON q.id = qd.quote_id
       WHERE (q.generated_request_id = r.id OR q.trigger_request_id = r.id)
         AND qd.deleted_at IS NULL) +
      (SELECT count(*) FROM sch_main.proposal_documents pd
       INNER JOIN sch_main.proposals p ON p.id = pd.proposal_id
       INNER JOIN sch_main.quotes q ON q.id = p.quote_id
       WHERE (q.generated_request_id = r.id OR q.trigger_request_id = r.id)
         AND pd.deleted_at IS NULL))::text AS attachment_count,
      '1' AS total
      FROM sch_main.requests r
      INNER JOIN sch_main.properties prop ON prop.id = r.property_id AND prop.deleted_at IS NULL
      LEFT JOIN sch_main.sub_specialties subesp ON subesp.id = r.sub_speciality_id
      WHERE lower(btrim(r.code)) = lower($1) AND r.deleted_at IS NULL`,
    values: [normalizedCode],
  });
  if (rows.length > 1) throw new Error('ALEXPERTO_CODE_CONFLICT');
  const row = rows[0];
  if (!row) return null;
  const property = properties.find(
    item => item.alexpertoPropertyId === row.property_id,
  );
  if (!property) throw new Error('FORBIDDEN');
  const { data: action, error } = await supabase
    .from('alexperto_audit_actions')
    .select('id, external_entity_id, current_status')
    .eq('external_entity_type', 'REQUEST')
    .eq('external_entity_id', row.id)
    .maybeSingle();
  if (error) throw error;
  const history = action
    ? ((await getActionHistory(supabase, [action.id])).get(action.id) ?? [])
    : [];
  return {
    externalRequestId: row.id,
    code: row.code,
    createdAt: new Date(row.created_at).toISOString(),
    startTime: row.start_time ? new Date(row.start_time).toISOString() : null,
    property: {
      id: row.property_id,
      name: row.property_name,
      gemaPropertyId: property.id,
    },
    specialty: row.specialty_name
      ? {
          name: row.specialty_name,
          code: specialtyCode(row.specialty_name) ?? 'OTHER',
        }
      : null,
    description: row.description,
    requestType: row.request_type,
    externalStatus: row.external_status,
    quoteCount: Number(row.quote_count),
    attachmentCount: Number(row.attachment_count),
    internalStatus: action?.current_status ?? 'PENDIENTE_REVISION',
    history,
  } satisfies AlexpertoRequestListItem;
}

export async function findRequestPropertyByCode(
  code: string,
  properties: AuthorizedProperty[],
) {
  const { rows } = await getAlexpertoPool().query<{ property_id: string }>({
    text: 'SELECT property_id FROM sch_main.requests WHERE lower(btrim(code)) = lower($1) AND deleted_at IS NULL',
    values: [code.trim()],
  });
  if (rows.length > 1) throw new Error('ALEXPERTO_CODE_CONFLICT');
  return rows[0]
    ? {
        property:
          properties.find(
            item => item.alexpertoPropertyId === rows[0].property_id,
          ) ?? null,
      }
    : null;
}

async function getActionHistory(supabase: SupabaseClient, actionIds: string[]) {
  if (!actionIds.length)
    return new Map<string, AlexpertoRequestHistoryItem[]>();

  const { data: history, error: historyError } = await supabase
    .from('alexperto_audit_action_history')
    .select('action_id, previous_status, new_status, created_at, created_by')
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

  const historyByActionId = new Map<string, AlexpertoRequestHistoryItem[]>();
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
      createdAt: row.created_at,
      createdBy: row.created_by ? { id: row.created_by, name } : null,
    });
    historyByActionId.set(row.action_id, entries);
  }
  return historyByActionId;
}

export async function findAuthorizedRequestProperty(
  externalRequestId: string,
  properties: AuthorizedProperty[],
) {
  const externalIds = properties.map(property => property.alexpertoPropertyId);
  if (!externalIds.length) return null;

  const { rows } = await getAlexpertoPool().query<{ property_id: string }>({
    text: `
      SELECT property_id
      FROM sch_main.requests
      WHERE id = $1 AND property_id = ANY($2::text[]) AND deleted_at IS NULL
      LIMIT 1
    `,
    values: [externalRequestId, externalIds],
  });
  const externalPropertyId = rows[0]?.property_id;
  if (!externalPropertyId) return null;

  return (
    properties.find(
      property => property.alexpertoPropertyId === externalPropertyId,
    ) ?? null
  );
}

function specialtyCode(name: string | null): AlexpertoSpecialtyCode | null {
  const codes: Record<string, AlexpertoSpecialtyCode> = {
    'sistema de aire acondicionado': 'AA',
    'equipos de ventilación mecánica': 'VM',
    'sistemas contra incendio': 'SCI',
    'tableros eléctricos': 'TE',
    'grupos electrógenos': 'GE',
    'bombas de agua y desagüe': 'BOM',
    'sistemas de seguridad y control': 'SSC',
    'sub estación eléctrica': 'SEE',
    'tableros de transferencia | distribución | otros relacionados': 'TTA',
    ascensores: 'ASC',
  };
  return name ? (codes[name.trim().toLowerCase()] ?? null) : null;
}
