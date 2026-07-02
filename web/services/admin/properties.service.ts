import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminPropertyRow } from '@/types/admin';

type AdminPropertyStatusFilter = 'active' | 'inactive' | 'all';

export async function listAdminProperties(
  supabase: SupabaseClient,
  status: AdminPropertyStatusFilter = 'active',
  equipmentTypeId?: string,
): Promise<AdminPropertyRow[]> {
  let query = supabase
    .from('properties')
    .select(
      'id, code, name, address, city, image_url, floor, basement, is_active',
    )
    .order('name', { ascending: true })
    .limit(250);

  if (status === 'active') {
    query = query.eq('is_active', true);
  }

  if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (equipmentTypeId) {
    const { data: equiposData, error: equiposError } = await supabase
      .from('equipos')
      .select('id_property')
      .eq('id_equipamento', equipmentTypeId);

    if (equiposError) throw equiposError;

    const propertyIds = Array.from(
      new Set((equiposData ?? []).map(e => e.id_property).filter((id): id is string => !!id))
    );

    if (propertyIds.length === 0) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    } else {
      query = query.in('id', propertyIds);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as AdminPropertyRow[];
}

export async function getAdminProperty(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<AdminPropertyRow | null> {
  const { data, error } = await supabase
    .from('properties')
    .select(
      'id, code, name, address, city, image_url, floor, basement, is_active',
    )
    .eq('id', propertyId)
    .maybeSingle();

  if (error) throw error;
  return data as AdminPropertyRow | null;
}

export async function createAdminProperty(
  supabase: SupabaseClient,
  property: Omit<AdminPropertyRow, 'id'>,
): Promise<AdminPropertyRow> {
  const { data, error } = await supabase
    .from('properties')
    .insert({
      id: crypto.randomUUID(),
      name: property.name,
      address: property.address,
      city: property.city,
      code: property.code || null,
      image_url: property.image_url || null,
      floor: property.floor !== undefined ? property.floor : null,
      basement: property.basement !== undefined ? property.basement : null,
      is_active: property.is_active !== undefined ? property.is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AdminPropertyRow;
}

export async function updateAdminProperty(
  supabase: SupabaseClient,
  propertyId: string,
  property: Partial<Omit<AdminPropertyRow, 'id'>>,
): Promise<AdminPropertyRow> {
  const { data, error } = await supabase
    .from('properties')
    .update({
      name: property.name,
      address: property.address,
      city: property.city,
      code: property.code !== undefined ? property.code || null : undefined,
      image_url: property.image_url,
      floor: property.floor !== undefined ? property.floor : undefined,
      basement: property.basement !== undefined ? property.basement : undefined,
      is_active:
        property.is_active !== undefined ? property.is_active : undefined,
    })
    .eq('id', propertyId)
    .select()
    .single();

  if (error) throw error;
  return data as AdminPropertyRow;
}

export async function updateAdminPropertyImage(
  supabase: SupabaseClient,
  propertyId: string,
  imageUrl: string,
): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .update({ image_url: imageUrl })
    .eq('id', propertyId);

  if (error) {
    throw new Error(
      `Error al actualizar la imagen del inmueble: ${error.message}`,
    );
  }
}
