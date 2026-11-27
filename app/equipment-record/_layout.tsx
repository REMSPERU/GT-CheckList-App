import {
  Redirect,
  Stack,
  useGlobalSearchParams,
  usePathname,
} from 'expo-router';
import { GemaPropertyAccess } from '@/components/gema-property-access';
import { useUserRole } from '@/hooks/use-user-role';

export default function EquipmentReportLayout() {
  const { isLoaded, canGenerateMaintenanceReports, role } = useUserRole();
  const pathname = usePathname();
  const { propertyId } = useGlobalSearchParams<{ propertyId?: string }>();
  if (!isLoaded) return null;
  if (!canGenerateMaintenanceReports) return <Redirect href="/" />;
  const stack = <Stack screenOptions={{ headerShown: false }} />;
  if (role !== 'PROVEEDOR' || !pathname.startsWith('/equipment-record/')) {
    return stack;
  }
  return (
    <GemaPropertyAccess
      enabled={canGenerateMaintenanceReports}
      propertyId={propertyId}>
      {stack}
    </GemaPropertyAccess>
  );
}
