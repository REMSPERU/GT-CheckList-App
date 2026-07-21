import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminEquipmentDetailRow,
  AdminEquipmentFilters,
  AdminEquipmentQrRow,
  AdminEquipmentRow,
  AdminPaginatedResult,
} from '@/types/admin';

import {
  getPropertiesById,
  uniqueValues,
  type EquipmentQueryRow,
} from './admin-query-helpers';
import { listAdminProperties } from './properties.service';
import { listAdminEquipmentTypes } from './equipment-types.service';

type AdminEquipmentRawRow = EquipmentQueryRow & {
  equipment_detail?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  created?: string | null;
  updated?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  [key: string]: unknown;
};

type AdminPropertyDetailRow = {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  is_active?: boolean | null;
  maintenance_priority?: string | null;
};

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

const DETAIL_FILTER_KEYS = [
  'marca',
  'modelo',
  'serie',
  'capacidad',
  'potencia',
  'rpm',
  'presion',
  'refrigerante',
  'tiene_vdf',
  'fases',
  'voltaje',
  'tipo_tablero',
  'anio_operacion',
] as const;

const OPERATION_YEAR_KEYS = [
  'anio_operacion',
  'ano_operacion',
  'anio_operacion_motor',
  'ano_operacion_motor',
  'motor_ano',
  'bomba_ano',
  'ano_tablero',
] as const;

export const ADDITIONAL_DETAIL_FILTERS = [
  { key: 'numero_unidad', label: 'Número de unidad' },
  { key: 'capacidad_bomba', label: 'Capacidad de bomba' },
  { key: 'capacidad_motor', label: 'Capacidad de motor' },
  { key: 'capacidad_enfriamiento', label: 'Capacidad de enfriamiento' },
  { key: 'capacidad_flujo', label: 'Capacidad de flujo' },
  { key: 'tipo_refrigerante', label: 'Tipo de refrigerante' },
  { key: 'tipo_compresor', label: 'Tipo de compresor' },
  { key: 'tipo_sistema', label: 'Tipo de sistema' },
  { key: 'estado_sistema', label: 'Estado del sistema' },
  { key: 'tipo_transferencia', label: 'Tipo de transferencia' },
  { key: 'tipo_llamada', label: 'Tipo de llamada' },
  { key: 'tipo_vidrio', label: 'Tipo de vidrio' },
  { key: 'sistema_operacion', label: 'Sistema operativo' },
  { key: 'software_marca', label: 'Marca de software' },
  { key: 'tiene_servidor', label: 'Tiene servidor' },
  { key: 'vdf.tiene_vdf', label: 'VDF integrado' },
] as const;

function getDetailValue(detail: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
    return (value as Record<string, unknown>)[segment];
  }, detail);
}

function getDetailJsonPath(key: string): string {
  const segments = key.split('.');
  return segments
    .map((segment, index) =>
      index === segments.length - 1 ? `->>${segment}` : `->${segment}`,
    )
    .reduce((path, segment) => `${path}${segment}`, 'equipment_detail');
}

async function getEquipmentTypeIdsBySystem(
  supabase: SupabaseClient,
  systemId: string,
) {
  const { data, error } = await supabase
    .from('equipamentos')
    .select('id')
    .eq('id_sistema', systemId);

  if (error) throw error;

  return (data ?? []).map(item => item.id as string);
}

/** Gets selectable technical-detail values for the current inventory scope. */
export async function getEquipmentDetailFilterOptions(
  supabase: SupabaseClient,
  filters?: {
    propertyIds?: string[];
    systemId?: string;
    equipmentTypeId?: string;
  },
): Promise<Record<string, string[]>> {
  const values = new Map<string, Set<string>>(
    DETAIL_FILTER_KEYS.map(key => [key, new Set<string>()]),
  );
  let matchedIds: string[] | null = null;
  if (filters?.systemId) {
    matchedIds = await getEquipmentTypeIdsBySystem(supabase, filters.systemId);
  }

  let pageNum = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('equipos')
      .select('equipment_detail')
      .not('equipment_detail', 'is', null)
      .range(pageNum * pageSize, pageNum * pageSize + pageSize - 1);

    if (filters?.propertyIds?.length) {
      query = query.in('id_property', filters.propertyIds);
    }
    if (matchedIds) {
      query = query.in(
        'id_equipamento',
        matchedIds.length > 0 ? matchedIds : [EMPTY_UUID],
      );
    }
    if (filters?.equipmentTypeId) {
      query = query.eq('id_equipamento', filters.equipmentTypeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    for (const row of data ?? []) {
      const detail = row.equipment_detail;
      if (!detail || typeof detail !== 'object' || Array.isArray(detail))
        continue;

      const record = detail as Record<string, unknown>;
      const technical =
        record.detalle_tecnico &&
        typeof record.detalle_tecnico === 'object' &&
        !Array.isArray(record.detalle_tecnico)
          ? (record.detalle_tecnico as Record<string, unknown>)
          : null;

      for (const key of DETAIL_FILTER_KEYS) {
        const value =
          key === 'anio_operacion'
            ? OPERATION_YEAR_KEYS.map(yearKey => record[yearKey]).find(
                year => year !== null && year !== undefined && year !== '',
              )
            : (technical?.[key] ?? record[key]);
        if (typeof value === 'string' && value.trim()) {
          values.get(key)?.add(value.trim());
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          values.get(key)?.add(String(value));
        }
      }

      for (const filter of ADDITIONAL_DETAIL_FILTERS) {
        const value = getDetailValue(record, filter.key);
        if (typeof value === 'string' && value.trim()) {
          values.set(filter.key, values.get(filter.key) ?? new Set<string>());
          values.get(filter.key)?.add(value.trim());
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          values.set(filter.key, values.get(filter.key) ?? new Set<string>());
          values.get(filter.key)?.add(String(value));
        }
      }
    }

    if (!data || data.length < pageSize) {
      hasMore = false;
    } else {
      pageNum++;
    }
  }

  return Object.fromEntries(
    Array.from(values, ([key, options]) => [
      key,
      Array.from(options).sort((a, b) => a.localeCompare(b)),
    ]),
  );
}

export async function getDistinctEquipmentDetailTypes(
  supabase: SupabaseClient,
  filters?: {
    propertyId?: string;
    propertyIds?: string[];
    systemId?: string;
    equipmentTypeId?: string;
  },
): Promise<string[]> {
  const types = new Set<string>();
  let pageNum = 0;
  const pageSize = 1000;
  let hasMore = true;

  // Pre-resolve system types once if systemId is provided
  let matchedIds: string[] | null = null;
  if (filters?.systemId) {
    matchedIds = await getEquipmentTypeIdsBySystem(supabase, filters.systemId);
  }

  while (hasMore) {
    const fromIdx = pageNum * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = supabase
      .from('equipos')
      .select('equipment_detail')
      .not('equipment_detail', 'is', null)
      .range(fromIdx, toIdx);

    if (filters?.propertyIds?.length) {
      query = query.in('id_property', filters.propertyIds);
    } else if (filters?.propertyId) {
      query = query.eq('id_property', filters.propertyId);
    }

    if (filters?.systemId && matchedIds) {
      query = query.in(
        'id_equipamento',
        matchedIds.length > 0 ? matchedIds : [EMPTY_UUID],
      );
    }

    if (filters?.equipmentTypeId) {
      query = query.eq('id_equipamento', filters.equipmentTypeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      data.forEach((item: any) => {
        const detail = item?.equipment_detail;
        if (detail && typeof detail === 'object') {
          const rawTipo = detail.tipo || detail.tipo_bomba;
          if (typeof rawTipo === 'string') {
            const trimmed = rawTipo.trim();
            if (trimmed) {
              types.add(trimmed);
            }
          }
        }
      });
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        pageNum++;
      }
    } else {
      hasMore = false;
    }
  }

  return Array.from(types).sort((a, b) => a.localeCompare(b));
}

export async function getDistinctEquipmentDetailSubtypes(
  supabase: SupabaseClient,
  filters?: {
    propertyId?: string;
    propertyIds?: string[];
    systemId?: string;
    equipmentTypeId?: string;
    tipo?: string;
  },
): Promise<string[]> {
  const subtypes = new Set<string>();
  let pageNum = 0;
  const pageSize = 1000;
  let hasMore = true;

  let matchedIds: string[] | null = null;
  if (filters?.systemId) {
    matchedIds = await getEquipmentTypeIdsBySystem(supabase, filters.systemId);
  }

  while (hasMore) {
    const fromIdx = pageNum * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = supabase
      .from('equipos')
      .select('equipment_detail')
      .not('equipment_detail', 'is', null)
      .range(fromIdx, toIdx);

    if (filters?.propertyIds?.length) {
      query = query.in('id_property', filters.propertyIds);
    } else if (filters?.propertyId) {
      query = query.eq('id_property', filters.propertyId);
    }

    if (filters?.systemId && matchedIds) {
      query = query.in(
        'id_equipamento',
        matchedIds.length > 0 ? matchedIds : [EMPTY_UUID],
      );
    }

    if (filters?.equipmentTypeId) {
      query = query.eq('id_equipamento', filters.equipmentTypeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      data.forEach((item: any) => {
        const detail = item?.equipment_detail;
        if (detail && typeof detail === 'object') {
          const rawTipo = detail.tipo || detail.tipo_bomba;
          if (filters?.tipo && rawTipo !== filters.tipo) {
            return;
          }
          const rawSubtipo =
            detail.subtipo ||
            detail.sub_tipo ||
            (detail.tipo && detail.tipo !== detail.tipo_bomba
              ? detail.tipo_bomba
              : detail.tipo_bomba && detail.tipo_bomba !== detail.tipo
                ? detail.tipo_bomba
                : undefined);
          if (typeof rawSubtipo === 'string') {
            const trimmed = rawSubtipo.trim();
            if (trimmed) {
              subtypes.add(trimmed);
            }
          }
        }
      });
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        pageNum++;
      }
    } else {
      hasMore = false;
    }
  }

  return Array.from(subtypes).sort((a, b) => a.localeCompare(b));
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
        config,
        properties!inner(id)
      `,
      { count: 'exact' },
    )
    .order('codigo', { ascending: true });

  if (filters.status && filters.status !== 'TODOS') {
    query = query.eq('estatus', filters.status);
  }

  if (filters.propertyIds?.length) {
    query = query.in('id_property', filters.propertyIds);
  } else if (filters.propertyId) {
    query = query.eq('id_property', filters.propertyId);
  }

  if (filters.systemId) {
    const matchedIds = await getEquipmentTypeIdsBySystem(
      supabase,
      filters.systemId,
    );
    query = query.in(
      'id_equipamento',
      matchedIds.length > 0 ? matchedIds : [EMPTY_UUID],
    );
  }

  if (filters.equipmentTypeId) {
    query = query.eq('id_equipamento', filters.equipmentTypeId);
  }

  if (filters.config && filters.config !== 'TODOS') {
    query = query.eq('config', filters.config === 'SI');
  }

  if (filters.city) {
    const allProps = await listAdminProperties(supabase);
    const matchedPropIds = allProps
      .filter(p => p.city === filters.city)
      .map(p => p.id);
    query = query.in(
      'id_property',
      matchedPropIds.length > 0 ? matchedPropIds : [EMPTY_UUID],
    );
  }

  if (filters.frecuencia) {
    const allTypes = await listAdminEquipmentTypes(supabase);
    const matchedTypeIds = allTypes
      .filter(t => t.frecuencia === filters.frecuencia)
      .map(t => t.id);
    query = query.in(
      'id_equipamento',
      matchedTypeIds.length > 0 ? matchedTypeIds : [EMPTY_UUID],
    );
  }

  if (filters.fases) {
    const allTypes = await listAdminEquipmentTypes(supabase);
    const selectedType = allTypes.find(t => t.id === filters.equipmentTypeId);
    const isElectricalPanel = selectedType?.abreviatura === 'TBELEC';
    if (isElectricalPanel) {
      query = query.eq(
        'equipment_detail->detalle_tecnico->>fases',
        filters.fases,
      );
    } else {
      query = query.eq('equipment_detail->>fases', filters.fases);
    }
  }

  if (filters.voltaje) {
    const allTypes = await listAdminEquipmentTypes(supabase);
    const selectedType = allTypes.find(t => t.id === filters.equipmentTypeId);
    const isElectricalPanel = selectedType?.abreviatura === 'TBELEC';
    if (isElectricalPanel) {
      query = query.eq(
        'equipment_detail->detalle_tecnico->>voltaje',
        filters.voltaje,
      );
    } else {
      query = query.ilike(
        'equipment_detail->>voltaje',
        `%${filters.voltaje.trim()}%`,
      );
    }
  }

  if (filters.tipoTablero) {
    query = query.eq(
      'equipment_detail->detalle_tecnico->>tipo_tablero',
      filters.tipoTablero,
    );
  }

  if (filters.marca) {
    query = query.ilike(
      'equipment_detail->>marca',
      `%${filters.marca.trim()}%`,
    );
  }

  if (filters.modelo) {
    query = query.ilike(
      'equipment_detail->>modelo',
      `%${filters.modelo.trim()}%`,
    );
  }

  if (filters.serie) {
    query = query.ilike(
      'equipment_detail->>serie',
      `%${filters.serie.trim()}%`,
    );
  }

  if (filters.capacidad) {
    query = query.ilike(
      'equipment_detail->>capacidad',
      `%${filters.capacidad.trim()}%`,
    );
  }

  if (filters.potencia) {
    query = query.ilike(
      'equipment_detail->>potencia',
      `%${filters.potencia.trim()}%`,
    );
  }

  if (filters.rpm) {
    query = query.ilike('equipment_detail->>rpm', `%${filters.rpm.trim()}%`);
  }

  if (filters.presion) {
    query = query.ilike(
      'equipment_detail->>presion',
      `%${filters.presion.trim()}%`,
    );
  }

  if (filters.refrigerante) {
    query = query.eq('equipment_detail->>refrigerante', filters.refrigerante);
  }

  if (filters.tipo) {
    query = query.or(
      `equipment_detail->>tipo.eq.${filters.tipo},equipment_detail->>tipo_bomba.eq.${filters.tipo}`,
    );
  }

  if (filters.subtipo) {
    query = query.or(
      `equipment_detail->>subtipo.eq.${filters.subtipo},equipment_detail->>sub_tipo.eq.${filters.subtipo},equipment_detail->>tipo_bomba.eq.${filters.subtipo}`,
    );
  }

  if (filters.tieneVdf && filters.tieneVdf !== 'TODOS') {
    query = query.eq(
      'equipment_detail->>tiene_vdf',
      filters.tieneVdf === 'SI' ? 'true' : 'false',
    );
  }

  if (filters.anioOperacion) {
    query = query.or(
      OPERATION_YEAR_KEYS.map(
        key => `equipment_detail->>${key}.eq.${filters.anioOperacion}`,
      ).join(','),
    );
  }

  for (const filter of ADDITIONAL_DETAIL_FILTERS) {
    const value = filters.detailFilters?.[filter.key];
    if (value) query = query.eq(getDetailJsonPath(filter.key), value);
  }

  if (search) {
    query = query.or(
      `ubicacion.ilike.%${search}%,detalle_ubicacion.ilike.%${search}%`,
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

  return {
    items: rows.map(item => {
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
    }),
    total: count ?? 0,
  };
}

export async function listAdminEquipmentsForQr(
  supabase: SupabaseClient,
  filters: Omit<AdminEquipmentFilters, 'page' | 'pageSize'>,
): Promise<AdminEquipmentQrRow[]> {
  const search = filters.search?.trim();
  const equipmentTypes = await listAdminEquipmentTypes(supabase);
  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );
  let query = supabase
    .from('equipos')
    .select('id, codigo, ubicacion, detalle_ubicacion, id_equipamento')
    .order('codigo', {
      ascending: true,
    });

  if (filters.status && filters.status !== 'TODOS') {
    query = query.eq('estatus', filters.status);
  }

  if (filters.propertyId) {
    query = query.eq('id_property', filters.propertyId);
  }

  if (filters.systemId) {
    const matchedIds = await getEquipmentTypeIdsBySystem(
      supabase,
      filters.systemId,
    );
    query = query.in(
      'id_equipamento',
      matchedIds.length > 0 ? matchedIds : [EMPTY_UUID],
    );
  }

  if (filters.equipmentTypeId) {
    query = query.eq('id_equipamento', filters.equipmentTypeId);
  }

  if (filters.config && filters.config !== 'TODOS') {
    query = query.eq('config', filters.config === 'SI');
  }

  if (filters.city) {
    const allProps = await listAdminProperties(supabase);
    const matchedPropIds = allProps
      .filter(p => p.city === filters.city)
      .map(p => p.id);
    query = query.in(
      'id_property',
      matchedPropIds.length > 0 ? matchedPropIds : [EMPTY_UUID],
    );
  }

  if (filters.frecuencia) {
    const matchedTypeIds = equipmentTypes
      .filter(t => t.frecuencia === filters.frecuencia)
      .map(t => t.id);
    query = query.in(
      'id_equipamento',
      matchedTypeIds.length > 0 ? matchedTypeIds : [EMPTY_UUID],
    );
  }

  if (filters.fases) {
    const selectedType = equipmentTypes.find(
      t => t.id === filters.equipmentTypeId,
    );
    const isElectricalPanel = selectedType?.abreviatura === 'TBELEC';
    if (isElectricalPanel) {
      query = query.eq(
        'equipment_detail->detalle_tecnico->>fases',
        filters.fases,
      );
    } else {
      query = query.eq('equipment_detail->>fases', filters.fases);
    }
  }

  if (filters.voltaje) {
    const selectedType = equipmentTypes.find(
      t => t.id === filters.equipmentTypeId,
    );
    const isElectricalPanel = selectedType?.abreviatura === 'TBELEC';
    if (isElectricalPanel) {
      query = query.eq(
        'equipment_detail->detalle_tecnico->>voltaje',
        filters.voltaje,
      );
    } else {
      query = query.ilike(
        'equipment_detail->>voltaje',
        `%${filters.voltaje.trim()}%`,
      );
    }
  }

  if (filters.tipoTablero) {
    query = query.eq(
      'equipment_detail->detalle_tecnico->>tipo_tablero',
      filters.tipoTablero,
    );
  }

  if (filters.marca) {
    query = query.ilike(
      'equipment_detail->>marca',
      `%${filters.marca.trim()}%`,
    );
  }

  if (filters.modelo) {
    query = query.ilike(
      'equipment_detail->>modelo',
      `%${filters.modelo.trim()}%`,
    );
  }

  if (filters.serie) {
    query = query.ilike(
      'equipment_detail->>serie',
      `%${filters.serie.trim()}%`,
    );
  }

  if (filters.capacidad) {
    query = query.ilike(
      'equipment_detail->>capacidad',
      `%${filters.capacidad.trim()}%`,
    );
  }

  if (filters.potencia) {
    query = query.ilike(
      'equipment_detail->>potencia',
      `%${filters.potencia.trim()}%`,
    );
  }

  if (filters.rpm) {
    query = query.ilike('equipment_detail->>rpm', `%${filters.rpm.trim()}%`);
  }

  if (filters.presion) {
    query = query.ilike(
      'equipment_detail->>presion',
      `%${filters.presion.trim()}%`,
    );
  }

  if (filters.refrigerante) {
    query = query.eq('equipment_detail->>refrigerante', filters.refrigerante);
  }

  if (filters.tipo) {
    query = query.eq('equipment_detail->>tipo', filters.tipo);
  }

  if (filters.tieneVdf && filters.tieneVdf !== 'TODOS') {
    query = query.eq(
      'equipment_detail->>tiene_vdf',
      filters.tieneVdf === 'SI' ? 'true' : 'false',
    );
  }

  if (search) {
    query = query.or(
      `ubicacion.ilike.%${search}%,detalle_ubicacion.ilike.%${search}%`,
    );
  }

  const allRows: AdminEquipmentQrRow[] = [];
  const batchSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await query.range(from, from + batchSize - 1);
    if (error) throw error;

    const rawRows = (data ?? []) as {
      id: string;
      codigo: string | null;
      ubicacion: string | null;
      detalle_ubicacion: string | null;
      id_equipamento: string | null;
    }[];
    const rows = rawRows
      .filter(item => !!item.codigo)
      .map(item => ({
        id: item.id,
        codigo: item.codigo as string,
        equipmentName: item.id_equipamento
          ? (equipmentTypesById.get(item.id_equipamento)?.nombre ?? 'Sin tipo')
          : 'Sin tipo',
        ubicacion: item.ubicacion,
        detalle_ubicacion: item.detalle_ubicacion,
      }));
    allRows.push(...rows);

    if (rawRows.length < batchSize) {
      break;
    }

    from += batchSize;
  }

  return allRows;
}

export async function getAdminEquipmentById(
  supabase: SupabaseClient,
  equipmentId: string,
): Promise<AdminEquipmentDetailRow | null> {
  const { data, error } = await supabase
    .from('equipos')
    .select('*, properties!inner(id)')
    .eq('id', equipmentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as AdminEquipmentRawRow;
  const [propertyResult, equipmentTypes] = await Promise.all([
    row.id_property
      ? supabase
          .from('properties')
          .select('*')
          .eq('id', row.id_property)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    listAdminEquipmentTypes(supabase),
  ]);

  if (propertyResult.error) throw propertyResult.error;

  const property = propertyResult.data as AdminPropertyDetailRow | null;
  const equipmentType = row.id_equipamento
    ? equipmentTypes.find(item => item.id === row.id_equipamento)
    : null;

  return {
    id: row.id,
    id_property: row.id_property,
    id_equipamento: row.id_equipamento,
    codigo: row.codigo,
    ubicacion: row.ubicacion,
    detalle_ubicacion: row.detalle_ubicacion,
    estatus: row.estatus,
    config: row.config,
    equipment_detail: row.equipment_detail ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    created: row.created ?? null,
    updated: row.updated ?? null,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    propertyName: property?.name ?? 'Sin inmueble',
    propertyCode: property?.code ?? null,
    propertyCity: property?.city ?? null,
    propertyAddress: property?.address ?? null,
    propertyPriority: property?.maintenance_priority ?? null,
    propertyIsActive: property?.is_active ?? null,
    equipmentName: equipmentType?.nombre ?? 'Sin tipo',
    equipmentAbbreviation: equipmentType?.abreviatura ?? null,
    equipmentFrequency: equipmentType?.frecuencia ?? null,
    systemName: equipmentType?.systemName ?? null,
    rawData: row,
  };
}

export async function updateAdminEquipment(
  supabase: SupabaseClient,
  equipmentId: string,
  updates: Partial<{
    codigo: string | null;
    ubicacion: string | null;
    detalle_ubicacion: string | null;
    estatus: string | null;
    config: boolean | null;
    equipment_detail: unknown;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from('equipos')
    .update(updates)
    .eq('id', equipmentId);

  if (error) {
    throw error;
  }
}
