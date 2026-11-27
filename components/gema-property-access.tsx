import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { AuthLoadingScreen } from '@/components/auth-loading-screen';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { DatabaseService } from '@/services/database';

export function GemaPropertyAccess({
  children,
  enabled,
  propertyId,
  equipmentId,
}: {
  children: ReactNode;
  enabled: boolean;
  propertyId?: string;
  equipmentId?: string;
}) {
  const { user } = useAuth();
  const { isLoaded, hasAssignedPropertyScope } = useUserRole();
  const userId = user?.id;
  const needsAssignment = enabled && hasAssignedPropertyScope;

  const assignment = useQuery({
    networkMode: 'always',
    queryKey: ['gema-property-access', userId, propertyId, equipmentId],
    enabled: needsAssignment && !!userId && !!propertyId,
    queryFn: async () => {
      if (!userId || !propertyId) return false;
      const properties =
        await DatabaseService.getLocalAssignedProperties(userId);
      if (!properties.some(property => property.id === propertyId))
        return false;
      if (!equipmentId) return true;
      const equipment = await DatabaseService.getEquipmentById(equipmentId);
      return equipment?.id_property === propertyId;
    },
  });

  if (!isLoaded || (needsAssignment && !!propertyId && assignment.isPending)) {
    return <AuthLoadingScreen />;
  }
  if (!enabled || (needsAssignment && assignment.data !== true)) {
    return <Redirect href="/" />;
  }
  return children;
}
