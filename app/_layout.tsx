import 'react-native-reanimated';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/contexts/AuthContext';
import { UserRoleProvider } from '@/contexts/UserRoleContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryProvider } from '@/lib/query-provider';
import { useAppUpdate } from '@/hooks/use-app-update';
import UpdateRequiredModal from '@/components/update-required-modal';

import { useEffect } from 'react';
import { DatabaseService } from '@/services/database';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const updateInfo = useAppUpdate();

  useEffect(() => {
    DatabaseService.initDatabase().catch(console.error);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <UserRoleProvider>
          <ThemeProvider
            value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="auth" />
              <Stack.Screen name="(tabs)" />
            </Stack>
            <StatusBar style="dark" />

            {/* Update Required Modal */}
            {updateInfo.needsUpdate && updateInfo.latestVersion && (
              <UpdateRequiredModal
                visible={true}
                currentVersion={updateInfo.currentVersion}
                latestVersion={updateInfo.latestVersion}
                downloadUrl={updateInfo.downloadUrl}
                releaseUrl={updateInfo.releaseUrl}
              />
            )}
          </ThemeProvider>
        </UserRoleProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
