import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminPropertyRow } from '@/types/admin';

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
