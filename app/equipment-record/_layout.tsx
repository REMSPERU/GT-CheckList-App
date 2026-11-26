import { Redirect, Stack } from 'expo-router';
import { useUserRole } from '@/hooks/use-user-role';

export default function EquipmentReportLayout() {
  const { isLoaded, canGenerateMaintenanceReports } = useUserRole();
  if (!isLoaded) return null;
  if (!canGenerateMaintenanceReports) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
