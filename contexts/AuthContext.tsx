import { useRouter, useSegments } from 'expo-router';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useRef,
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
    data: user,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useCurrentUser(hasSession);

  const isLoading =
    !isInitialized ||
    isLoadingUser ||
    loginMutation.isPending ||
    logoutMutation.isPending ||
    registerMutation.isPending;
  const isAuthenticated = !!user && hasSession;

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
      if (event === 'SIGNED_IN' && session) {
        setHasSession(true);

        // Skip refetch if we already did it during initialization
        if (hasInitialFetch.current) {
        } else {
          await refetchUser();
        }

        // Save user to local DB with role from public.users
        if (session.user) {
          try {
            // Fetch role from public.users table
            const { data: publicUser } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();

            const userRole = publicUser?.role || '';
            await DatabaseService.saveCurrentUser({
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.username,
              first_name: session.user.user_metadata?.first_name,
              last_name: session.user.user_metadata?.last_name,
              role: userRole,
            });
          } catch (err) {
            console.error(
              '[AuthContext] Failed to save user to local DB:',
              err,
            );
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] SIGNED_OUT - clearing session');
        setHasSession(false);
        hasInitialFetch.current = false;
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('[AuthContext] TOKEN_REFRESHED');
        setHasSession(true);
      } else if (event === 'INITIAL_SESSION') {
        console.log(
          '[AuthContext] INITIAL_SESSION event - hasSession:',
          !!session,
        );
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
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      const session = await supabaseAuthService.getSession();
      setHasSession(!!session);

      if (session) {
        hasInitialFetch.current = true; // Mark that we're doing the initial fetch
        await refetchUser();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      setHasSession(false);
    } finally {
      setIsInitialized(true);
    }
  };

  /**
   * Handle authentication failure
   */
  const handleAuthFailure = async () => {
    try {
      // Clear local state
      setHasSession(false);
      setError(null);

      // Sign out from Supabase
      await supabaseAuthService.signOut();

      // Mark as initialized to allow navigation
      setIsInitialized(true);

      // Navigate to login
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
      setHasSession(true);

      // User data is automatically updated by React Query
    } catch (err) {
      const error = err as Error;
      const errorMessage =
        error.message || 'Error al iniciar sesión. Verifica tus credenciales.';

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
      setHasSession(false);

      // Navigation will be handled by the useEffect hook
    } catch (err) {
      console.error('Logout error:', err);
      // Clear session anyway
      setHasSession(false);
      await supabaseAuthService.signOut();
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
      // If refresh fails, handle auth failure
      await handleAuthFailure();
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

  // Show loading screen while initializing
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
