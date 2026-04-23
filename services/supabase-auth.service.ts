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

  // Enviar correo de recuperacion de contrasena
  async sendPasswordResetEmail(email: string, redirectTo: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) throw error;
  }

  // Restaurar sesion temporal desde el enlace de recuperacion
  async setRecoverySession(accessToken: string, refreshToken: string) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) throw error;
  }

  // Verificar token/hash de recovery y crear sesion temporal
  async verifyRecoveryToken(tokenHash: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    });

    if (error) throw error;

    return data;
  }

  // Actualizar contrasena del usuario autenticado
  async updatePassword(
    password: string,
    options?: { clearTemporaryPasswordFlag?: boolean },
  ) {
    const clearTemporaryPasswordFlag =
      options?.clearTemporaryPasswordFlag ?? false;

    const { data, error } = await supabase.auth.updateUser({
      password,
      ...(clearTemporaryPasswordFlag
        ? {
            data: {
              must_change_password: false,
            },
          }
        : {}),
    });

    if (error) throw error;

    return data;
  }
}

export const supabaseAuthService = new SupabaseAuthService();
