import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/database';
import { useAuth } from './AuthContext';

export type UserRole = 'SUPERVISOR' | 'TECNICO' | 'SUPERADMIN';

interface LocalUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface UserRoleContextType {
  role: UserRole;
  isLoaded: boolean;
  refreshRole: () => Promise<void>;

  // Role checks
  isSupervisor: boolean;
  isTechnician: boolean;
  isAdmin: boolean;

  // Permission checks
  canScheduleMaintenance: boolean;
  canExecuteMaintenance: boolean;
  canViewAllMaintenances: boolean;
  canViewAssignedOnly: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(
  undefined,
);

interface UserRoleProviderProps {
  children: ReactNode;
}

export function UserRoleProvider({ children }: UserRoleProviderProps) {
  const { user } = useAuth();
  const [localRole, setLocalRole] = useState<UserRole>('TECNICO');
  const [remoteRole, setRemoteRole] = useState<UserRole | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch role from Supabase (remote)
  const fetchRemoteRole = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data?.role) {
        const newRole = data.role as UserRole;
        setRemoteRole(newRole);
        // Update local SQLite with the latest role
        await DatabaseService.updateLocalUserRole(user.id, newRole);
        setLocalRole(newRole);
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
          if (localUser?.role) {
            setLocalRole(localUser.role as UserRole);
          }
        } catch (error) {
          console.error('Error loading local user role:', error);
        }
      }
      setIsLoaded(true);
    };
    loadLocalRole();
  }, [user?.id]);

  // Fetch remote role ONCE when user logs in
  useEffect(() => {
    if (!user?.id) {
      setRemoteRole(null);
      setIsLoaded(false);
      return;
    }

    fetchRemoteRole();
  }, [user?.id, fetchRemoteRole]);

  // Optionally refresh role when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user?.id) {
        fetchRemoteRole();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => subscription.remove();
  }, [user?.id, fetchRemoteRole]);

  // Priority: remote Supabase role (real-time) > local SQLite (offline fallback)
  const role: UserRole = remoteRole || localRole;

  const value: UserRoleContextType = {
    role,
    isLoaded,
    refreshRole: fetchRemoteRole,

    // Role checks
    isSupervisor: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    isTechnician: role === 'TECNICO',
    isAdmin: role === 'SUPERADMIN',

    // Permission checks
    canScheduleMaintenance: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    canExecuteMaintenance: true,
    canViewAllMaintenances: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    canViewAssignedOnly: role === 'TECNICO',
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
