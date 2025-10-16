import { useRouter, useSegments } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AuthLoadingScreen } from '../components/auth-loading-screen';
import { apiClient } from '../services/api.service';
import { TokenService } from '../services/token.service';
import type { ErrorResponse, LoginRequest, User } from '../types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Handle route protection
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and trying to access protected routes
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated and on auth pages
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      const hasTokens = await TokenService.hasTokens();
      
      if (hasTokens) {
        // Try to get current user
        const userData = await apiClient.getCurrentUser();
        setUser(userData);
      }
    } catch (err) {
      console.error('Failed to initialize auth:', err);
      // Clear invalid tokens
      await TokenService.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.login(credentials);
      setUser(response.user);
      
      // Navigation will be handled by the useEffect hook
    } catch (err) {
      const errorResponse = err as ErrorResponse;
      const errorMessage = typeof errorResponse.detail === 'string' 
        ? errorResponse.detail 
        : 'Error al iniciar sesión. Verifica tus credenciales.';
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
      setUser(null);
      
      // Navigation will be handled by the useEffect hook
    } catch (err) {
      console.error('Logout error:', err);
      // Clear user anyway
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh current user data
   */
  const refreshUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
      // If refresh fails, user might be logged out
      setUser(null);
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
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    error,
    clearError,
  };

  // Show loading screen while initializing
  if (isLoading) {
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
