import { Redirect, Stack } from 'expo-router';
import { useUserRole } from '@/hooks/use-user-role';

export default function ScheduledMaintenanceLayout() {
  const { isLoaded, canExecuteMaintenance } = useUserRole();
  if (!isLoaded) return null;
  if (!canExecuteMaintenance) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
