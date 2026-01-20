import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { supabaseAuthService } from '../services/supabase-auth.service';
import { DatabaseService } from '../services/database';
import type { LoginRequest, RegisterRequest } from '../types/api';
import type { User } from '@supabase/supabase-js';

// Query Keys
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
  verify: () => [...authKeys.all, 'verify'] as const,
};

/**
 * Hook to get current user
 */
export function useCurrentUser(
  enabled = true,
): UseQueryResult<User | null, Error> {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: async () => {
      try {
        // 1. Try online fetch
        const user = await supabaseAuthService.getCurrentUser();
        return user;
      } catch (_error) {
        console.log(
          'Network auth check failed, checking local storage...' + _error,
        );

        // 2. Fallback: Check if we have a valid session in AsyncStorage (handled by Supabase)
        // verify if we have a session
        const session = await supabaseAuthService.getSession();

        if (session && session.user) {
          // 3. Try to get user details from local SQLite
          const localUser = (await DatabaseService.getLocalUserById(
            session.user.id,
          )) as any;
          if (localUser) {
            console.log('User restored from local DB');
            // Construct a minimal User object compatible with Supabase User type
            return {
              id: localUser.id,
              aud: 'authenticated',
              role: 'authenticated',
              email: localUser.email,
              created_at: '',
              app_metadata: {},
              user_metadata: {
                username: localUser.username,
                first_name: localUser.first_name,
                last_name: localUser.last_name,
                role: localUser.role || 'TECNICO',
              },
            } as User;
          }
        }
        return null;
      }
    },
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to login
 */
export function useLogin(): UseMutationResult<User, Error, LoginRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const data = await supabaseAuthService.signIn(
        credentials.email_or_username,
        credentials.password,
      );
      return data.user;
    },
    onSuccess: (user: User) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      // Set user data in cache
      queryClient.setQueryData(authKeys.currentUser(), user);
    },
    onError: () => {
      queryClient.removeQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

/**
 * Hook to register
 */
export function useRegister(): UseMutationResult<User, Error, RegisterRequest> {
  return useMutation({
    mutationFn: async (credentials: RegisterRequest) => {
      const data = await supabaseAuthService.signUp(
        credentials.email,
        credentials.password,
        credentials.username,
      );

      if (!data.user) {
        throw new Error('Failed to create user');
      }

      return data.user;
    },
  });
}

/**
 * Hook to logout
 */
export function useLogout(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await supabaseAuthService.signOut();
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();
    },
  });
}
