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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
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
                releaseNotes={updateInfo.releaseNotes}
              />
            )}
          </ThemeProvider>
        </UserRoleProvider>
      </AuthProvider>
    </QueryProvider>
  );
});
