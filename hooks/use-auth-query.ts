import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabaseAuthService } from "../services/supabase-auth.service";
import type {
  LoginRequest,
  RegisterRequest,
} from "../types/api";
import type { User } from "@supabase/supabase-js";

// Query Keys
export const authKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authKeys.all, "current-user"] as const,
  verify: () => [...authKeys.all, "verify"] as const,
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
        return await supabaseAuthService.getCurrentUser();
      } catch (error) {
        console.error("Error getting current user:", error);
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
export function useLogin(): UseMutationResult<
  User,
  Error,
  LoginRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const data = await supabaseAuthService.signIn(
        credentials.email_or_username,
        credentials.password
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
    }
  });
}

/**
 * Hook to register
 */
export function useRegister(): UseMutationResult<
  User,
  Error,
  RegisterRequest
> {
  return useMutation({
    mutationFn: async (credentials: RegisterRequest) => {
      const data = await supabaseAuthService.signUp(
        credentials.email,
        credentials.password,
        credentials.username
      );

      if (!data.user) {
        throw new Error("Failed to create user");
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


