import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminRole, AdminUser } from '@/types/auth';

export interface AuthorizedProperty {
  id: string;
  name: string;
  alexpertoPropertyId: string;
  responsible: { id: string; name: string | null } | null;
}

export async function resolveAuthorizedProperties(
  supabase: SupabaseClient,
  user: AdminUser,
): Promise<AuthorizedProperty[]> {
  let query = supabase
    .from('properties')
    .select('id, name, alexperto_property_id');

  if (user.role === ('AUDITOR' as AdminRole)) {
    const { data: assignments, error } = await supabase
      .from('user_properties')
      .select('property_id')
      .eq('user_id', user.id)
      .or('expires_at.is.null,expires_at.gt.now()');
    if (error) throw error;
    const ids = (assignments ?? []).map(row => row.property_id as string);
    if (!ids.length) return [];
    query = query.in('id', ids);
  }

  const { data, error } = await query
    .eq('is_active', true)
    .not('alexperto_property_id', 'is', null);
  if (error) throw error;

  return (data ?? []).map(property => ({
    id: property.id as string,
    name: property.name as string,
    alexpertoPropertyId: property.alexperto_property_id as string,
    responsible:
      user.role === ('AUDITOR' as AdminRole)
        ? {
            id: user.id,
            name:
              [user.first_name, user.last_name].filter(Boolean).join(' ') ||
              null,
          }
        : null,
  }));
}
