import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { authApi } from '../services/auth.api';
import type {
  ErrorResponse,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserResponse,
} from '../types/api';

// Query Keys
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
  verify: () => [...authKeys.all, 'verify'] as const,
};

/**
 * Hook to get current user
 */
export function useCurrentUser(enabled = true): UseQueryResult<UserResponse, ErrorResponse> {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: authApi.getCurrentUser,
    enabled,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to verify token
 */
export function useVerifyToken(enabled = true): UseQueryResult<boolean, ErrorResponse> {
  return useQuery({
    queryKey: authKeys.verify(),
    queryFn: authApi.verifyToken,
    enabled,
    retry: false,
    staleTime: 0,
  });
}

/**
 * Hook to login
 */
export function useLogin(): UseMutationResult<TokenResponse, ErrorResponse, LoginRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      // Set user data in cache
      queryClient.setQueryData(authKeys.currentUser(), data.user);
    },
  });
}

/**
 * Hook to register
 */
export function useRegister(): UseMutationResult<UserResponse, ErrorResponse, RegisterRequest> {
  return useMutation({
    mutationFn: authApi.register,
  });
}

/**
 * Hook to logout
 */
export function useLogout(): UseMutationResult<void, ErrorResponse, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
    },
  });
}

/**
 * Hook to refresh token
 */
export function useRefreshToken(): UseMutationResult<TokenResponse, ErrorResponse, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.refreshToken,
    onSuccess: () => {
      // Invalidate current user query
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}
