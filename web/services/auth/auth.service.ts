import { getSiteUrl, getSupabaseClient } from '@/lib/supabase-browser';
import type { AdminUser, AuthResult } from '@/types/auth';

const TOKEN_REFRESH_MARGIN_MS = 60_000;

/** Obtiene un token vigente y lo renueva antes de que expire. */
export async function getAccessToken(forceRefresh = false): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) throw new Error('Sesion no disponible');

  const expiresAt = session.expires_at ?? 0;
  const shouldRefresh =
    forceRefresh || expiresAt * 1000 - Date.now() < TOKEN_REFRESH_MARGIN_MS;

  if (!shouldRefresh) return session.access_token;

  const {
    data: { session: refreshedSession },
    error,
  } = await supabase.auth.refreshSession();

  if (error || !refreshedSession?.access_token) {
    throw new Error('Sesion expirada. Vuelve a iniciar sesion');
  }

  return refreshedSession.access_token;
}

/**
 * Ejecuta una solicitud autenticada y recupera una sesion que haya quedado
 * desactualizada entre la lectura local y la validacion del servidor.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  async function send(forceRefresh: boolean) {
    const headers = new Headers(init?.headers);
    headers.set(
      'Authorization',
      `Bearer ${await getAccessToken(forceRefresh)}`,
    );

    return fetch(input, { ...init, headers });
  }

  const response = await send(false);
  if (response.status !== 401) return response;

  return send(true);
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data } = await supabase
    .from('users')
    .select('id, email, username, first_name, last_name, role, is_active')
    .eq('id', session.user.id)
    .single();

  if (!data?.is_active) return null;

  return {
    id: data.id,
    email: data.email ?? session.user.email ?? 'Usuario',
    username: data.username,
    first_name: data.first_name,
    last_name: data.last_name,
    role: data.role,
    is_active: data.is_active,
  };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { errorMessage: error?.message ?? null };
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/login`,
    },
  });

  return { errorMessage: error?.message ?? null };
}

export async function sendPasswordResetEmail(
  email: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/reset-password`,
  });

  return { errorMessage: error?.message ?? null };
}

export async function updateRecoveredPassword(
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { errorMessage: error.message };

  await supabase.auth.signOut();
  return { errorMessage: null };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}
