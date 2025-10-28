import { useRouter, useSegments } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AuthLoadingScreen } from '../components/auth-loading-screen';
import { useCurrentUser, useLogin, useLogout, useRegister } from '../hooks/use-auth-query';
import { TokenService } from '../services/token.service';
import type { ErrorResponse, LoginRequest, RegisterRequest, User } from '../types/api';

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
  const [hasTokens, setHasTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // React Query hooks
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const { data: user, isLoading: isLoadingUser, refetch: refetchUser } = useCurrentUser(hasTokens);

  const isLoading = !isInitialized || isLoadingUser || loginMutation.isPending || logoutMutation.isPending || registerMutation.isPending;
  const isAuthenticated = !!user && hasTokens;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
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
  }, [isAuthenticated, segments, isInitialized]);

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      const tokensExist = await TokenService.hasTokens();
      setHasTokens(tokensExist);
      
      if (tokensExist) {
        // React Query will automatically fetch user data
        await refetchUser();
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      // Clear invalid tokens
      await TokenService.clearTokens();
      setHasTokens(false);
    } finally {
      setIsInitialized(true);
    }
  };

  /**
   * Login user
   */
  const login = async (credentials: LoginRequest) => {
    try {
      setError(null);
      
      const response = await loginMutation.mutateAsync(credentials);
      setHasTokens(true);
      
      // User data is automatically updated by React Query
    } catch (err) {
      const errorResponse = err as ErrorResponse;
      const errorMessage = typeof errorResponse.detail === 'string' 
        ? errorResponse.detail 
        : 'Error al iniciar sesión. Verifica tus credenciales.';
      
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
      const errorResponse = err as ErrorResponse;
      const errorMessage = typeof errorResponse.detail === 'string' 
        ? errorResponse.detail 
        : 'Error al registrar el usuario. Verifica tus datos.'; 
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
      setHasTokens(false);
      
      // Navigation will be handled by the useEffect hook
    } catch (err) {
      console.error('Logout error:', err);
      // Clear tokens anyway
      setHasTokens(false);
      await TokenService.clearTokens();
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
      // If refresh fails, user might be logged out
      setHasTokens(false);
      await TokenService.clearTokens();
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
