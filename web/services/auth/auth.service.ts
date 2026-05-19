import { getSiteUrl, getSupabaseClient } from '@/lib/supabase-browser';
import type { AdminUser, AuthResult } from '@/types/auth';

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  return { email: session.user.email ?? 'Usuario' };
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
