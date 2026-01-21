import { useRouter, useSegments } from 'expo-router';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { AuthLoadingScreen } from '../components/auth-loading-screen';
import {
  useCurrentUser,
  useLogin,
  useLogout,
  useRegister,
} from '../hooks/use-auth-query';
import { supabaseAuthService } from '../services/supabase-auth.service';
import { supabase } from '../lib/supabase';
import { DatabaseService } from '../services/database';
import type { LoginRequest, RegisterRequest } from '../types/api';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  register: (credentials: RegisterRequest) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Ref to track if we already fetched user during initialization
  const hasInitialFetch = useRef(false);

  // React Query hooks
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const {
    data: remoteUser,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useCurrentUser(hasSession);

  // Computed user: prefer remote user (fresh), fallback to local user (offline)
  const user = remoteUser || localUser;

  const isLoading =
    !isInitialized ||
    (hasSession && isLoadingUser && !user) || // Only show loading if we have a session but no user data yet (neither local nor remote)
    loginMutation.isPending ||
    logoutMutation.isPending ||
    registerMutation.isPending;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for Supabase auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseAuthService.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth event: ${event}`);

      if (event === 'SIGNED_IN' && session) {
        setHasSession(true);
        setIsAuthenticated(true);

        // Update local session
        if (session.user) {
          await DatabaseService.saveSession({
            user_id: session.user.id,
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user_metadata: session.user.user_metadata,
            expires_at: session.expires_at || 0,
            last_active: new Date().toISOString(),
          });

          // Also save as current user for role lookups
          await saveUserToLocalDb(session.user);
        }

        // Fetch fresh data if needed
        if (!hasInitialFetch.current) {
          await refetchUser();
        }
      } else if (event === 'SIGNED_OUT') {
        setHasSession(false);
        setIsAuthenticated(false);
        setLocalUser(null);
        hasInitialFetch.current = false;
        await DatabaseService.clearSession();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setHasSession(true);
        setIsAuthenticated(true);
        // Update tokens in local storage
        if (session.user) {
          await DatabaseService.saveSession({
            user_id: session.user.id,
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user_metadata: session.user.user_metadata,
            expires_at: session.expires_at || 0,
            last_active: new Date().toISOString(),
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle route protection
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and trying to access protected routes
      setTimeout(() => router.replace('/auth/login'), 100);
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated and on auth pages
      setTimeout(() => router.replace('/(tabs)'), 100);
    }
  }, [isAuthenticated, segments, isInitialized, router]);

  /**
   * Helper to save user to local DB
   */
  const saveUserToLocalDb = async (authUser: User) => {
    try {
      // 1. Try to fetch role from public.users table (if online)
      let userRole = '';
      try {
        const { data: publicUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .single();
        userRole = publicUser?.role || '';
      } catch (e) {
        // Ignore network errors, proceed with existing or empty role
        console.log('Could not fetch remote role, continuing...');
      }

      // 2. Save/Update local user
      await DatabaseService.saveCurrentUser({
        id: authUser.id,
        email: authUser.email || '',
        username: authUser.user_metadata?.username,
        first_name: authUser.user_metadata?.first_name,
        last_name: authUser.user_metadata?.last_name,
        role: userRole,
      });
    } catch (err) {
      console.error('[AuthContext] Failed to save user to local DB:', err);
    }
  };

  /**
   * Initialize authentication state
   * OFFLINE-FIRST STRATEGY:
   * 1. Check SQLite local_session first (fast, works offline)
   * 2. If valid, set authenticated IMMEDIATELY
   * 3. Sync with Supabase in background
   */
  const initializeAuth = async () => {
    try {
      // 1. Check Local SQLite Session
      const localSession = await DatabaseService.getSession();

      if (localSession && localSession.access_token) {
        console.log('[AuthContext] Found local session in SQLite');
        setHasSession(true);
        setIsAuthenticated(true);

        // Construct a partial User object from local metadata for immediate UI rendering
        // This stops the UI from flickering or showing "Loading..." while online check happens
        const offlineUser: any = {
          id: localSession.user_id,
          aud: 'authenticated',
          role: 'authenticated',
          email: '', // We might need to store email in local_session if needed explicitly here
          email_confirmed_at: '',
          phone: '',
          confirmed_at: '',
          last_sign_in_at: localSession.last_active,
          app_metadata: {},
          user_metadata: localSession.user_metadata || {},
          identities: [],
          created_at: '',
          updated_at: '',
        };
        setLocalUser(offlineUser as User);

        // If we have a local session, we are "initialized" enough to show the app
        setIsInitialized(true);
      }

      // 2. Background: Validate with Supabase (if online)
      const session = await supabaseAuthService.getSession();

      if (session) {
        console.log('[AuthContext] Supabase session confirmed');
        setHasSession(true);
        setIsAuthenticated(true);
        hasInitialFetch.current = true;
        await refetchUser(); // Fetch full user profile including updated metadata
      } else if (localSession) {
        // Edge case: Local session exists but Supabase client says no (maybe token expired or cache cleared)
        // We should probably try to refresh or trust Supabase and expire local session.
        // For now, if Supabase explicitly says NULL, we trust it and clear local.
        console.log(
          '[AuthContext] Local session invalid by Supabase standards. Clearing.',
        );
        await handleAuthFailure();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      // If error (e.g. SQLite failure), fallback to unauthenticated
      if (!isAuthenticated) {
        setHasSession(false);
      }
    } finally {
      setIsInitialized(true);
    }
  };

  /**
   * Handle authentication failure
   */
  const handleAuthFailure = async () => {
    try {
      setHasSession(false);
      setIsAuthenticated(false);
      setLocalUser(null);
      setError(null);
      await DatabaseService.clearSession();
      await supabaseAuthService.signOut();

      setIsInitialized(true);
      router.replace('/auth/login');
    } catch (err) {
      console.error('Error handling auth failure:', err);
    }
  };

  /**
   * Login user
   */
  const login = async (credentials: LoginRequest) => {
    try {
      setError(null);
      await loginMutation.mutateAsync(credentials);
      // Success is handled by onAuthStateChange listener
    } catch (err) {
      const error = err as Error;
      const errorMessage =
        error.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      console.log('Login error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Register user
   */
  const register = async (credentials: RegisterRequest) => {
    try {
      setError(null);
      await registerMutation.mutateAsync(credentials);
    } catch (err) {
      const error = err as Error;
      const errorMessage =
        error.message || 'Error al registrar el usuario. Verifica tus datos.';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      await handleAuthFailure();
    } catch (err) {
      console.error('Logout error:', err);
      await handleAuthFailure();
    }
  };

  /**
   * Refresh current user data
   */
  const refreshUser = async () => {
    try {
      await refetchUser();
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user: user || null,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    error,
    clearError,
    register,
  };

  // Show loading screen while initializing ONLY if we don't have a local session fallback
  if (!isInitialized) {
    return <AuthLoadingScreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication
 * Throws error if user is not authenticated
 */
export function useRequireAuth(): User {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) {
    throw new Error('Authentication required');
  }
  return user;
}
