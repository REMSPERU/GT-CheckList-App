import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { DatabaseService } from '@/services/database';

export type UserRole = 'SUPERVISOR' | 'TECNICO' | 'SUPERADMIN';

interface LocalUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [localRole, setLocalRole] = useState<UserRole>('TECNICO');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLocalRole = async () => {
      if (user?.id) {
        try {
          const localUser = (await DatabaseService.getLocalUserById(
            user.id,
          )) as LocalUser | null;
          if (localUser?.role) {
            setLocalRole(localUser.role as UserRole);
            console.log(
              '📋 [useUserRole] Loaded role from SQLite:',
              localUser.role,
            );
          }
        } catch (error) {
          console.error('Error loading local user role:', error);
        }
      }
      setIsLoaded(true);
    };
    loadLocalRole();
  }, [user?.id]);

  // Priority: user metadata (online) > local SQLite (offline)
  const role: UserRole = (user?.user_metadata?.role as UserRole) || localRole;

  console.log(
    '📋 [useUserRole] Current role:',
    role,
    '| From metadata:',
    user?.user_metadata?.role,
    '| From local:',
    localRole,
  );

  return {
    role,
    isLoaded,

    // Role checks
    isSupervisor: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    isTechnician: role === 'TECNICO',
    isAdmin: role === 'SUPERADMIN',

    // Permission checks
    canScheduleMaintenance: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    canExecuteMaintenance: true, // All roles can execute (assigned ones for technicians)
    canViewAllMaintenances: role === 'SUPERVISOR' || role === 'SUPERADMIN',
    canViewAssignedOnly: role === 'TECNICO',
  };
};
