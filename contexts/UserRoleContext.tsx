import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/database';
import { useAuth } from './AuthContext';
import {
  getGemaPermissions,
  normalizeGemaRole,
  type GemaRole,
} from '@/types/gema-role';

export type UserRole = GemaRole;

interface LocalUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface UserRoleContextType extends ReturnType<typeof getGemaPermissions> {
  role: UserRole | null;
  isLoaded: boolean;
  refreshRole: () => Promise<void>;

  // Role checks
  isSupervisor: boolean;
  isTechnician: boolean;
  isAuditor: boolean;
  isAdmin: boolean;

  // Permission checks
  canAudit: boolean;
  canViewAllMaintenances: boolean;
  canViewAssignedOnly: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(
  undefined,
);

interface UserRoleProviderProps {
  children: ReactNode;
}

/** Minimum interval between foreground role re-fetches (ms) */
const ROLE_FETCH_THROTTLE_MS = 60_000;

export function UserRoleProvider({ children }: UserRoleProviderProps) {
  const { user } = useAuth();
  const [localRole, setLocalRole] = useState<{
    userId: string;
    role: UserRole | null;
  } | null>(null);
  const [remoteRole, setRemoteRole] = useState<{
    userId: string;
    role: UserRole | null;
  } | null>(null);
  const lastFetchTime = useRef<number>(0);

  // Fetch role from Supabase (remote)
  const fetchRemoteRole = useCallback(async () => {
    if (!user?.id) return;

    try {
      lastFetchTime.current = Date.now();
      const { data, error } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        const role = data.is_active ? normalizeGemaRole(data.role) : null;
        await DatabaseService.updateLocalUserRole(user.id, role ?? '');
        setRemoteRole({ userId: user.id, role });
      }
    } catch (error) {
      console.error('Error fetching remote user role:', error);
    }
  }, [user?.id]);

  // Load role from local SQLite (for offline fallback)
  useEffect(() => {
    const loadLocalRole = async () => {
      if (user?.id) {
        try {
          const localUser = (await DatabaseService.getLocalUserById(
            user.id,
          )) as LocalUser | null;
          setLocalRole({
            userId: user.id,
            role: normalizeGemaRole(localUser?.role),
          });
        } catch (error) {
          setLocalRole({ userId: user.id, role: null });
          console.error('Error loading local user role:', error);
        }
      }
    };
    loadLocalRole();
  }, [user?.id]);

  // Fetch remote role ONCE when user logs in
  useEffect(() => {
    if (!user?.id) {
      setRemoteRole(null);
      setLocalRole(null);
      return;
    }

    fetchRemoteRole();
  }, [user?.id, fetchRemoteRole]);

  // Optionally refresh role when app comes back to foreground (throttled)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user?.id) {
        const elapsed = Date.now() - lastFetchTime.current;
        if (elapsed >= ROLE_FETCH_THROTTLE_MS) {
          fetchRemoteRole();
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => subscription.remove();
  }, [user?.id, fetchRemoteRole]);

  // Priority: remote Supabase role (real-time) > local SQLite (offline fallback)
  const profile =
    remoteRole && remoteRole.userId === user?.id
      ? remoteRole
      : localRole && localRole.userId === user?.id
        ? localRole
        : null;
  const role = profile?.role ?? null;

  const value: UserRoleContextType = {
    role,
    isLoaded: profile !== null,
    ...getGemaPermissions(role),
    refreshRole: fetchRemoteRole,

    // Role checks
    isSupervisor: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    isTechnician: role === 'TECNICO',
    isAuditor: role === 'AUDITOR',
    isAdmin: role === 'SUPERADMIN',

    // Permission checks
    canAudit: role === 'AUDITOR' || role === 'SUPERADMIN',
    canViewAllMaintenances: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    canViewAssignedOnly: role === 'TECNICO' || role === 'AUDITOR',
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextType {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
