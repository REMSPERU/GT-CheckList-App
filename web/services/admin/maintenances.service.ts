import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminMaintenanceRow,
  AdminMaintenanceSessionFilters,
  AdminMaintenanceSessionRow,
} from '@/types/admin';

import {
  getPropertiesById,
  uniqueValues,
  type EquipmentQueryRow,
  type MaintenanceQueryRow,
} from './admin-query-helpers';
import { listAdminEquipmentTypes } from './equipment-types.service';

export async function listAdminMaintenances(
  supabase: SupabaseClient,
): Promise<AdminMaintenanceRow[]> {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select(
      `
        id,
        id_equipo,
        codigo,
        dia_programado,
        tipo_mantenimiento,
        estatus
      `,
    )
    .order('dia_programado', { ascending: false })
    .limit(250);

  if (error) throw error;

  const rows = (data ?? []) as MaintenanceQueryRow[];
  const equipmentIds = uniqueValues(rows.map(item => item.id_equipo));
  const { data: equipmentData, error: equipmentError } = equipmentIds.length
    ? await supabase
        .from('equipos')
        .select('id, id_property, id_equipamento, codigo')
        .in('id', equipmentIds)
    : { data: [], error: null };

  if (equipmentError) throw equipmentError;

  const equipmentRows = (equipmentData ?? []) as Pick<
    EquipmentQueryRow,
    'id' | 'id_property' | 'id_equipamento' | 'codigo'
  >[];
  const equipmentById = new Map(equipmentRows.map(item => [item.id, item]));
  const [propertiesById, equipmentTypes] = await Promise.all([
    getPropertiesById(
      supabase,
      uniqueValues(equipmentRows.map(item => item.id_property)),
    ),
    listAdminEquipmentTypes(supabase),
  ]);
  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );

  return rows.map(item => {
    const equipment = item.id_equipo ? equipmentById.get(item.id_equipo) : null;
    const property = equipment?.id_property
      ? propertiesById.get(equipment.id_property)
      : null;
    const equipmentType = equipment?.id_equipamento
      ? equipmentTypesById.get(equipment.id_equipamento)
      : null;

    return {
      id: item.id,
      codigo: item.codigo,
      dia_programado: item.dia_programado,
      tipo_mantenimiento: item.tipo_mantenimiento,
      estatus: item.estatus,
      propertyName: property?.name ?? 'Sin inmueble',
      equipmentCode: equipment?.codigo ?? null,
      equipmentType: equipmentType?.nombre ?? 'Sin tipo',
    };
  });
}

export async function listAdminMaintenanceSessions(
  supabase: SupabaseClient,
  filters: AdminMaintenanceSessionFilters = {},
): Promise<AdminMaintenanceSessionRow[]> {
  let query = supabase
    .from('sesion_mantenimiento')
    .select('id, nombre, descripcion, fecha_programada, estatus, id_property, created_at')
    .order('fecha_programada', { ascending: false });

  if (filters.status && filters.status !== 'TODOS') {
    query = query.eq('estatus', filters.status);
  }

  if (filters.propertyId) {
    query = query.eq('id_property', filters.propertyId);
  }

  if (filters.startDate) {
    query = query.gte('fecha_programada', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('fecha_programada', filters.endDate);
  }

  const { data: sessionData, error: sessionError } = await query.limit(200);
  if (sessionError) throw sessionError;

  const sessions = sessionData ?? [];
  if (sessions.length === 0) return [];

  const sessionIds = uniqueValues(sessions.map(s => s.id));

  // Fetch maintenances (mantenimientos table) belonging to these sessions
  const { data: maintData, error: maintError } = await supabase
    .from('mantenimientos')
    .select('id, id_sesion, id_equipo, tipo_mantenimiento, estatus')
    .in('id_sesion', sessionIds);

  if (maintError) throw maintError;

  const maintenances = maintData ?? [];

  // Fetch unique equipment mapping
  const equipmentIds = uniqueValues(maintenances.map(m => m.id_equipo));
  const { data: equipmentData, error: equipmentError } = equipmentIds.length
    ? await supabase
        .from('equipos')
        .select('id, id_property, id_equipamento, codigo')
        .in('id', equipmentIds)
    : { data: [], error: null };

  if (equipmentError) throw equipmentError;

  const equipmentRows = equipmentData ?? [];
  const equipmentById = new Map(equipmentRows.map(item => [item.id, item]));

  const [propertiesById, equipmentTypes] = await Promise.all([
    getPropertiesById(
      supabase,
      uniqueValues(sessions.map(item => item.id_property)),
    ),
    listAdminEquipmentTypes(supabase),
  ]);

  const equipmentTypesById = new Map(
    equipmentTypes.map(item => [item.id, item]),
  );

  const mappedSessions: AdminMaintenanceSessionRow[] = sessions.map(session => {
    const property = session.id_property ? propertiesById.get(session.id_property) : null;
    const sessionMaintenances = maintenances.filter(m => m.id_sesion === session.id);

    const sessionEquipmentTypes: string[] = [];
    const sessionEquipmentCodes: string[] = [];
    let completedCount = 0;

    sessionMaintenances.forEach(m => {
      if (m.estatus === 'FINALIZADO') {
        completedCount++;
      }
      const equip = m.id_equipo ? equipmentById.get(m.id_equipo) : null;
      if (equip) {
        if (equip.codigo) {
          sessionEquipmentCodes.push(equip.codigo);
        }
        if (equip.id_equipamento) {
          const typeName = equipmentTypesById.get(equip.id_equipamento)?.nombre;
          if (typeName && !sessionEquipmentTypes.includes(typeName)) {
            sessionEquipmentTypes.push(typeName);
          }
        }
      }
    });

    return {
      id: session.id,
      nombre: session.nombre,
      descripcion: session.descripcion,
      fecha_programada: session.fecha_programada,
      estatus: session.estatus,
      propertyId: session.id_property,
      propertyName: property?.name ?? 'Sin inmueble',
      propertyCode: property?.code ?? null,
      created_at: session.created_at,
      equipmentTypes: sessionEquipmentTypes,
      equipmentCodes: sessionEquipmentCodes,
      maintenancesCount: sessionMaintenances.length,
      completedCount,
    };
  });

  // Apply post-filtering for equipmentTypeId if specified
  if (filters.equipmentTypeId) {
    const selectedType = equipmentTypesById.get(filters.equipmentTypeId);
    if (selectedType) {
      return mappedSessions.filter(s =>
        s.equipmentTypes.includes(selectedType.nombre),
      );
    }
  }

  return mappedSessions;
}
