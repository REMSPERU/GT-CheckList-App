import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

import type { AdminRole, AdminUser } from '@/types/auth';

interface SuperAdminSession {
  supabase: SupabaseClient;
  user: AdminUser;
}

function getEnvValues() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }

  return { supabaseUrl, supabasePublishableKey };
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;

  return authorization.slice('Bearer '.length);
}

export function createServerSupabaseClient(accessToken?: string | null) {
  const { supabaseUrl, supabasePublishableKey } = getEnvValues();

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export async function requireSuperAdminSession(
  request: NextRequest,
): Promise<SuperAdminSession> {
  const accessToken = getBearerToken(request);
  if (!accessToken) throw new Error('UNAUTHENTICATED');

  const authClient = createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  if (userError || !user) throw new Error('UNAUTHENTICATED');

  const supabase = createServerSupabaseClient(accessToken);
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, username, first_name, last_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_active) throw new Error('FORBIDDEN');
  if (profile.role !== 'SUPERADMIN') throw new Error('FORBIDDEN');

  return {
    supabase,
    user: {
      id: profile.id,
      email: profile.email ?? user.email ?? 'Usuario',
      username: profile.username,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role as AdminRole,
      is_active: profile.is_active,
    },
  };
}
