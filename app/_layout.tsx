import 'react-native-reanimated';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryProvider } from '@/lib/query-provider';

import { useEffect } from 'react';
import { DatabaseService } from '@/services/database';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    DatabaseService.initDatabase().catch(console.error);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
            {/* <Stack.Screen name="+not-found" /> */}
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
