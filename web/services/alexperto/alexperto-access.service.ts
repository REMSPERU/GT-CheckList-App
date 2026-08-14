import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthorizedProperty {
  id: string;
  name: string;
  alexpertoPropertyId: string;
}

export async function resolveAuthorizedProperties(
  supabase: SupabaseClient,
): Promise<AuthorizedProperty[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, alexperto_property_id')
    .eq('is_active', true)
    .not('alexperto_property_id', 'is', null)
    .order('name', { ascending: true });
  if (error) throw error;

  return (data ?? []).map(property => ({
    id: property.id as string,
    name: property.name as string,
    alexpertoPropertyId: property.alexperto_property_id as string,
  }));
}
