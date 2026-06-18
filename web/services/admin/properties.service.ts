import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminPropertyRow } from '@/types/admin';

export async function listAdminProperties(
  supabase: SupabaseClient,
): Promise<AdminPropertyRow[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, address, city, image_url, floor, basement')
    .order('name', { ascending: true })
    .limit(250);

  if (error) throw error;

  return (data ?? []) as AdminPropertyRow[];
}

export async function getAdminProperty(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<AdminPropertyRow | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, address, city, image_url, floor, basement')
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
      code: property.code !== undefined ? (property.code || null) : undefined,
      image_url: property.image_url,
      floor: property.floor !== undefined ? property.floor : undefined,
      basement: property.basement !== undefined ? property.basement : undefined,
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
    throw new Error(`Error al actualizar la imagen del inmueble: ${error.message}`);
  }
}
