'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AlexpertoQuoteFilters } from '@/schemas/alexperto.schema';
import type { AlexpertoQuoteListItem } from '@/types/alexperto';

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
  external_entity_id: string;
  current_status: AlexpertoQuoteListItem['internalStatus'];
  notes: string | null;
  auditor_comment: string | null;
  paul_comment: string | null;
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
) {
  const propertyByExternalId = new Map(
    properties.map(property => [property.alexpertoPropertyId, property]),
  );
  const externalIds = properties.map(property => property.alexpertoPropertyId);
  if (!externalIds.length) {
    return { total: 0, items: [] as AlexpertoQuoteListItem[] };
  }

  const specialtyFilter = `AND (
    cardinality($3::text[]) = 0 OR
    CASE lower(subesp.name)
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
    END = ANY($3::text[])
  )`;
  const externalStatusFilter = `AND (
    cardinality($4::text[]) = 0 OR
    coalesce(up.latest_proposal_status, q.latest_quote_status) = ANY($4::text[])
  )`;
  const offset = (filters.page - 1) * filters.pageSize;
  const order = `${SORT_COLUMNS[filters.sort]} ${filters.direction === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;

  const values = [
    externalIds,
    filters.montoMinimo,
    filters.especialidades,
    filters.estadoExterno,
    filters.pageSize,
    offset,
  ];

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
         subesp.name AS specialty_name, coalesce(req.description, q.description) AS service,
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
         AND coalesce(up.cost, 0) >= $2 ${specialtyFilter} ${externalStatusFilter}
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
        const code = specialtyCode(String(row.specialty_name));
        return {
          externalQuoteId: String(row.id),
          code: String(row.code),
          createdAt: new Date(row.created_at).toISOString(),
          property: {
            id: String(row.property_id),
            name: String(row.property_name),
            gemaPropertyId: property!.id,
          },
          specialty: { name: String(row.specialty_name), code },
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
          responsible: property?.responsible ?? null,
        } satisfies AlexpertoQuoteListItem;
      }),
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

function specialtyCode(
  name: string,
): AlexpertoQuoteListItem['specialty']['code'] {
  const codes: Record<string, AlexpertoQuoteListItem['specialty']['code']> = {
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
  return codes[name.toLowerCase()] ?? 'AA';
}

async function getActions(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('alexperto_audit_actions')
    .select(
      'external_entity_id, current_status, notes, auditor_comment, paul_comment',
    )
    .eq('external_entity_type', 'QUOTE')
    .in('external_entity_id', ids);
  if (error) throw error;
  return (data ?? []) as AuditActionRow[];
}
