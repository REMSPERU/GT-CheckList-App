import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminPropertyRow,
  AdminUserPropertyAccessRow,
  AdminUserRow,
} from '@/types/admin';
import type { AdminRole } from '@/types/auth';

const USER_SELECT =
  'id, email, username, first_name, last_name, role, is_active';

export const ADMIN_ROLE_OPTIONS: { label: string; value: AdminRole }[] = [
  { label: 'Tecnico', value: 'TECNICO' },
  { label: 'Auditor', value: 'AUDITOR' },
  { label: 'Supervisor', value: 'SUPERVISOR' },
  { label: 'Superadmin', value: 'SUPERADMIN' },
];

export async function listAdminUsers(
  supabase: SupabaseClient,
): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .order('first_name', { ascending: true })
    .order('email', { ascending: true });

  if (error) throw error;

  return (data ?? []) as AdminUserRow[];
}

export async function updateAdminUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: AdminRole,
): Promise<AdminUserRow> {
  const { data, error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select(USER_SELECT)
    .single();

  if (error) throw error;

  return data as AdminUserRow;
}

export async function countActiveSuperadmins(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'SUPERADMIN')
    .eq('is_active', true);

  if (error) throw error;

  return count ?? 0;
}

export async function listAssignableProperties(
  supabase: SupabaseClient,
): Promise<AdminPropertyRow[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, code, name, address, city, is_active, maintenance_priority, image_url')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(500);

  if (error) throw error;

  return (data ?? []) as AdminPropertyRow[];
}

export async function listUserPropertyAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdminUserPropertyAccessRow[]> {
  const { data, error } = await supabase
    .from('user_properties')
    .select(
      'id, user_id, property_id, property_role, expires_at, assigned_at, assignment_reason, properties(id, name, code)',
    )
    .eq('user_id', userId)
    .order('assigned_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(item => {
    const property = Array.isArray(item.properties)
      ? item.properties[0]
      : item.properties;

    return {
      id: item.id,
      user_id: item.user_id,
      property_id: item.property_id,
      property_role: item.property_role,
      expires_at: item.expires_at,
      assigned_at: item.assigned_at,
      assignment_reason: item.assignment_reason,
      propertyName: property?.name ?? item.property_id,
      propertyCode: property?.code ?? null,
    };
  });
}

export async function assignUserToProperty(
  supabase: SupabaseClient,
  input: {
    userId: string;
    propertyId: string;
    propertyRole?: string | null;
    assignmentReason?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('user_properties').upsert(
    {
      id: crypto.randomUUID(),
      user_id: input.userId,
      property_id: input.propertyId,
      property_role: input.propertyRole ?? null,
      assignment_reason: input.assignmentReason ?? null,
      assigned_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id,property_id' },
  );

  if (error) throw error;
}

export async function unassignUserFromProperty(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_properties')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);

  if (error) throw error;
}
