'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminMetric {
  label: string;
  value: number;
  note: string;
}

export interface AdminEquipmentRow {
  id: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  config: boolean | null;
  propertyName: string;
  propertyCode: string | null;
  propertyCity: string | null;
  equipmentName: string;
  equipmentAbbreviation: string | null;
}

export interface AdminPropertyRow {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  city: string | null;
  is_active: boolean | null;
  maintenance_priority: string | null;
}

export interface AdminMaintenanceRow {
  id: string;
  codigo: string | null;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  estatus: string | null;
  propertyName: string;
  equipmentCode: string | null;
  equipmentType: string;
}

interface RelatedProperty {
  name?: string | null;
  code?: string | null;
  city?: string | null;
}

interface RelatedEquipmentType {
  nombre?: string | null;
  abreviatura?: string | null;
}

interface EquipmentQueryRow {
  id: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  config: boolean | null;
  properties?: RelatedProperty | RelatedProperty[] | null;
  equipamentos?: RelatedEquipmentType | RelatedEquipmentType[] | null;
}

interface MaintenanceQueryRow {
  id: string;
  codigo: string | null;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  estatus: string | null;
  equipos?:
    | (Pick<EquipmentQueryRow, 'codigo'> & {
        properties?: RelatedProperty | RelatedProperty[] | null;
        equipamentos?: RelatedEquipmentType | RelatedEquipmentType[] | null;
      })
    | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getAdminMetrics(
  supabase: SupabaseClient,
): Promise<AdminMetric[]> {
  const [properties, equipments, activeEquipments, pending, completed] =
    await Promise.all([
      supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('equipos').select('id', { count: 'exact', head: true }),
      supabase
        .from('equipos')
        .select('id', { count: 'exact', head: true })
        .eq('estatus', 'ACTIVO'),
      supabase
        .from('mantenimientos')
        .select('id', { count: 'exact', head: true })
        .in('estatus', ['NO_INICIADO', 'EN_PROGRESO', 'PENDIENTE']),
      supabase
        .from('mantenimientos')
        .select('id', { count: 'exact', head: true })
        .eq('estatus', 'FINALIZADO'),
    ]);

  const results = [
    properties,
    equipments,
    activeEquipments,
    pending,
    completed,
  ];
  const failedResult = results.find(result => result.error);
  if (failedResult?.error) throw failedResult.error;

  return [
    {
      label: 'Inmuebles activos',
      value: properties.count ?? 0,
      note: 'Sedes operativas',
    },
    {
      label: 'Equipos registrados',
      value: equipments.count ?? 0,
      note: 'Inventario total',
    },
    {
      label: 'Equipos activos',
      value: activeEquipments.count ?? 0,
      note: 'Disponibles',
    },
    {
      label: 'Mantenimientos abiertos',
      value: pending.count ?? 0,
      note: 'Por atender',
    },
    {
      label: 'Mantenimientos finalizados',
      value: completed.count ?? 0,
      note: 'Historico',
    },
  ];
}

export async function listAdminEquipments(
  supabase: SupabaseClient,
): Promise<AdminEquipmentRow[]> {
  const { data, error } = await supabase
    .from('equipos')
    .select(
      `
        id,
        codigo,
        ubicacion,
        detalle_ubicacion,
        estatus,
        config,
        properties (name, code, city),
        equipamentos (nombre, abreviatura)
      `,
    )
    .order('codigo', { ascending: true })
    .limit(250);

  if (error) throw error;

  return ((data ?? []) as EquipmentQueryRow[]).map(item => {
    const property = firstRelation(item.properties);
    const equipmentType = firstRelation(item.equipamentos);

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
  });
}

export async function listAdminProperties(
  supabase: SupabaseClient,
): Promise<AdminPropertyRow[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, address, city, is_active, maintenance_priority')
    .order('name', { ascending: true })
    .limit(250);

  if (error) throw error;

  return (data ?? []) as AdminPropertyRow[];
}

export async function listAdminMaintenances(
  supabase: SupabaseClient,
): Promise<AdminMaintenanceRow[]> {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select(
      `
        id,
        codigo,
        dia_programado,
        tipo_mantenimiento,
        estatus,
        equipos (
          codigo,
          properties (name),
          equipamentos (nombre)
        )
      `,
    )
    .order('dia_programado', { ascending: false })
    .limit(250);

  if (error) throw error;

  return ((data ?? []) as MaintenanceQueryRow[]).map(item => {
    const property = firstRelation(item.equipos?.properties);
    const equipmentType = firstRelation(item.equipos?.equipamentos);

    return {
      id: item.id,
      codigo: item.codigo,
      dia_programado: item.dia_programado,
      tipo_mantenimiento: item.tipo_mantenimiento,
      estatus: item.estatus,
      propertyName: property?.name ?? 'Sin inmueble',
      equipmentCode: item.equipos?.codigo ?? null,
      equipmentType: equipmentType?.nombre ?? 'Sin tipo',
    };
  });
}
