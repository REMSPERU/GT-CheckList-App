import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { DatabaseService } from '@/services/database';
import { InitialSyncScreen } from '@/components/initial-sync-screen';
import { AuthLoadingScreen } from '@/components/auth-loading-screen';

import { Colors } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  const { isAdmin } = useUserRole();
  const [hasLocalMirror, setHasLocalMirror] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkMirror() {
      try {
        const hasMirror = await DatabaseService.hasUsableLocalMirror();
        if (isMounted) {
          setHasLocalMirror(hasMirror);
        }
      } catch (err) {
        console.error('[TabLayout] Error checking local mirror:', err);
        if (isMounted) {
          setHasLocalMirror(false);
        }
      }
    }
    checkMirror();
    return () => {
      isMounted = false;
    };
  }, []);

  if (hasLocalMirror === null) {
    return <AuthLoadingScreen />;
  }

  if (hasLocalMirror === false) {
    return <InitialSyncScreen onComplete={() => setHasLocalMirror(true)} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors.light.tabBarBackground,
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={24} color={color} />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="checklist"
        options={{
          title: 'Check Lists',
          tabBarIcon: ({ color }) => (
            <Octicons name="checklist" size={24} color={color} />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="qr-scanner"
        options={{
          title: 'Escanear QR',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="qr-code-scanner" size={24} color={color} />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Mantenimiento',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home-repair-service" size={24} color={color} />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={24} color={color} />
          ),
          href: isAdmin ? '/admin' : null,
        }}
      />
    </Tabs>
  );
}
