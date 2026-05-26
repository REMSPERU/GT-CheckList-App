import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminPropertyRow } from '@/types/admin';

export async function listAdminProperties(
  supabase: SupabaseClient,
): Promise<AdminPropertyRow[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, address, city, is_active, maintenance_priority, image_url')
    .order('name', { ascending: true })
    .limit(250);

  if (error) throw error;

  return (data ?? []) as AdminPropertyRow[];
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
