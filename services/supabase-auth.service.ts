import { supabase } from '@/lib/supabase';

type AuthErrorLike = {
  message?: string;
  status?: number;
  name?: string;
};

export class SupabaseAuthService {
  private isInvalidRefreshTokenError(error: unknown): boolean {
    const authError = error as AuthErrorLike;
    const message = authError?.message?.toLowerCase() || '';

    return (
      message.includes('invalid refresh token') ||
      message.includes('refresh token not found')
    );
  }

  private async clearLocalSession(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.warn(
        '[SupabaseAuthService] Failed to clear local session',
        error,
      );
    }
  }

  // Registrar nuevo usuario
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) throw error;

    return data;
  }
  // Iniciar sesión
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }
  // Cerrar sesión
  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (!error) return;

    if (this.isInvalidRefreshTokenError(error)) {
      await this.clearLocalSession();
      return;
    }

    throw error;
  }
  // Obtener usuario actual
  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      if (this.isInvalidRefreshTokenError(error)) {
        await this.clearLocalSession();
        return null;
      }

      throw error;
    }
  }
  // Escuchar cambios de autenticación
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
  // Obtener sesión actual
  async getSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      if (this.isInvalidRefreshTokenError(error)) {
        await this.clearLocalSession();
        return null;
      }

      throw error;
    }
  }

  // Obtener token de acceso
  async getAccessToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  }
}

export const supabaseAuthService = new SupabaseAuthService();
