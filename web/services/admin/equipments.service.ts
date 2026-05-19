import type { SupabaseClient } from '@supabase/supabase-js';

import type {
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

  if (filters.propertyId) {
    query = query.eq('id_property', filters.propertyId);
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
