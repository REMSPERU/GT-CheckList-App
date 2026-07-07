import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminPropertyRow,
  AdminUserCreateInput,
  AdminUserPasswordResult,
  AdminUserPasswordUpdateInput,
  AdminUserPropertyAccessRow,
  AdminUserRow,
} from '@/types/admin';
import type { AdminRole } from '@/types/auth';

const USER_SELECT =
  'id, email, username, first_name, last_name, role, is_active';

export const ADMIN_ROLE_OPTIONS: { label: string; value: AdminRole }[] = [
  { label: 'Tecnico', value: 'TECNICO' },
  { label: 'Tecnico REMS', value: 'TECNICO_REMS' },
  { label: 'Auditor', value: 'AUDITOR' },
  { label: 'Supervisor', value: 'SUPERVISOR' },
  { label: 'Superadmin', value: 'SUPERADMIN' },
];

const PASSWORD_CHARACTERS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?';

export function generateRandomPassword(length = 16) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, value =>
    PASSWORD_CHARACTERS.charAt(value % PASSWORD_CHARACTERS.length),
  ).join('');
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolvePassword(input: AdminUserPasswordUpdateInput) {
  if (input.generatePassword) return generateRandomPassword();

  const password = input.password?.trim();
  if (!password) throw new Error('PASSWORD_REQUIRED');

  return password;
}

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

export async function createAdminUser(
  supabase: SupabaseClient,
  input: AdminUserCreateInput,
): Promise<{ user: AdminUserRow; generatedPassword: string | null }> {
  const password = resolvePassword(input);
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: emptyToNull(input.username),
        first_name: emptyToNull(input.firstName),
        last_name: emptyToNull(input.lastName),
        role: input.role,
      },
    });

  if (authError) throw authError;
  if (!authData.user) throw new Error('AUTH_USER_NOT_CREATED');

  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: authData.user.id,
      email,
      username: emptyToNull(input.username),
      first_name: emptyToNull(input.firstName),
      last_name: emptyToNull(input.lastName),
      role: input.role,
      is_active: input.isActive,
      updated_at: now,
    })
    .select(USER_SELECT)
    .single();

  if (error) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw error;
  }

  return {
    user: data as AdminUserRow,
    generatedPassword: input.generatePassword ? password : null,
  };
}

export async function updateAdminUserPassword(
  supabase: SupabaseClient,
  userId: string,
  input: AdminUserPasswordUpdateInput,
): Promise<AdminUserPasswordResult> {
  const password = resolvePassword(input);
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) throw error;

  return { generatedPassword: input.generatePassword ? password : null };
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

  return (data ?? []) as unknown as AdminPropertyRow[];
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
