import 'react-native-reanimated';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { AuthProvider } from '@/contexts/AuthContext';
import { UserRoleProvider } from '@/contexts/UserRoleContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryProvider } from '@/lib/query-provider';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useMemoryWarning } from '@/hooks/useMemoryWarning';
import UpdateRequiredModal from '@/components/update-required-modal';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { useEffect } from 'react';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { syncQueue } from '@/services/sync-queue';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  // Mobile Replay adds continuous screenshot/redaction overhead.
  // Disabled for normal sessions to reduce memory pressure on Android;
  // only capture replays when an error occurs.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,
  integrations: Platform.OS === 'web' ? [] : [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Global handler for unhandled promise rejections — captures to Sentry
// instead of letting the app crash silently.
if (typeof global !== 'undefined') {
  const originalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();

  (global as any).ErrorUtils?.setGlobalHandler?.(
    (error: Error, isFatal?: boolean) => {
      Sentry.captureException(error, {
        tags: { fatal: String(!!isFatal), handler: 'global' },
      });
      if (__DEV__) {
        console.error('[Global Error]', error);
      }
      // Call original handler so RN's red box still works in dev
      originalHandler?.(error, isFatal);
    },
  );
}

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const updateInfo = useAppUpdate();
  useMemoryWarning();

  // Ordered initialization: DB first, then sync services
  useEffect(() => {
    (async () => {
      try {
        await DatabaseService.initDatabase();
        // Only start sync services after DB is ready
        await syncQueue.start();
        await syncService.start();
        console.log('[Init] Database and sync services initialized');
      } catch (err) {
        console.error('[Init] Initialization failed:', err);
        Sentry.captureException(err);
      }
    })();
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <UserRoleProvider>
          <ThemeProvider
            value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
            <ErrorBoundary fallbackMessage="La aplicación tuvo un error inesperado. Presiona reintentar para continuar.">
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="auth" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </ErrorBoundary>
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
