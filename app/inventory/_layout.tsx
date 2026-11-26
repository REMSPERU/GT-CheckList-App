import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { GemaPropertyAccess } from '@/components/gema-property-access';
import { useUserRole } from '@/hooks/use-user-role';

export default function InventoryLayout() {
  const { canViewInventory, canManageAssets } = useUserRole();
  const pathname = usePathname();
  const isAddEquipment = pathname.endsWith('/add-equipo');
  const { propertyId, equipoId } = useGlobalSearchParams<{
    propertyId?: string;
    equipoId?: string;
  }>();

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="systems" />
      <Stack.Screen name="[sistemaId]/equipamentos" />
      <Stack.Screen name="[equipamentoId]/equipos" />
      <Stack.Screen name="[equipamentoId]/add-equipo" />
      <Stack.Screen name="[equipoId]/index" />
      <Stack.Screen name="[equipoId]/detail" />
      <Stack.Screen name="[equipoId]/history" />
    </Stack>
  );

  if (!pathname.startsWith('/inventory')) return stack;

  return (
    <GemaPropertyAccess
      enabled={isAddEquipment ? canManageAssets : canViewInventory}
      propertyId={propertyId}
      equipmentId={equipoId}>
      {stack}
    </GemaPropertyAccess>
  );
}
