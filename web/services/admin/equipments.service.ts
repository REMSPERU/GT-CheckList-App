import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminEquipmentDetailRow,
  AdminEquipmentFilters,
  AdminEquipmentRow,
  AdminPaginatedResult,
} from '@/types/admin';

import {
  getPropertiesById,
  uniqueValues,
  type EquipmentQueryRow,
} from './admin-query-helpers';
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

  if (filters.propertyId) {
    query = query.eq('id_property', filters.propertyId);
  }

  if (filters.systemId) {
    const { data: matchedEquipamentos } = await supabase
      .from('equipamentos')
      .select('id')
      .eq('id_sistema', filters.systemId);

    const matchedIds = (matchedEquipamentos ?? []).map(item => item.id);
    query = query.in(
      'id_equipamento',
      matchedIds.length > 0
        ? matchedIds
        : ['00000000-0000-0000-0000-000000000000'],
    );
  }

  if (filters.equipmentTypeId) {
    query = query.eq('id_equipamento', filters.equipmentTypeId);
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
