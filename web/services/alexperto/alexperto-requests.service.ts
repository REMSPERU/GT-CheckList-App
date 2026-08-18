'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AlexpertoRequestFilters } from '@/schemas/alexperto.schema';
import type {
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
    return { total: 0, items: [] as AlexpertoRequestListItem[] };

  const offset = (filters.page - 1) * filters.pageSize;
  const order = `${SORT_COLUMNS[filters.sort]} ${filters.direction === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
  const values: unknown[] = [
    externalIds,
    filters.requestTypes,
    filters.especialidades,
    filters.estadoExterno,
    filters.search,
    filters.inmuebles,
    filters.pageSize,
    offset,
  ];
  const client = await getAlexpertoPool().connect();
  let result: { rows: RequestRow[] };
  try {
    await client.query('SET statement_timeout TO 30000');
    result = await client.query<RequestRow>({
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
      ), paged AS (
        SELECT *, count(*) OVER() AS total
        FROM base
        ORDER BY ${order}, id DESC
        LIMIT $7 OFFSET $8
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
    });
  } finally {
    client.release();
  }
  const ids = result.rows.map(row => row.id);
  const actionResult = ids.length
    ? await supabase
        .from('alexperto_audit_actions')
        .select('external_entity_id, current_status')
        .eq('external_entity_type', 'REQUEST')
        .in('external_entity_id', ids)
    : { data: [], error: null };
  const { data, error } = actionResult;
  if (error) throw error;
  const internalStatusById = new Map(
    (data ?? []).map(action => [
      action.external_entity_id,
      action.current_status,
    ]),
  );
  return {
    total: Number(result.rows[0]?.total ?? 0),
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
            internalStatusById.get(row.id) ?? 'PENDIENTE_REVISION',
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
