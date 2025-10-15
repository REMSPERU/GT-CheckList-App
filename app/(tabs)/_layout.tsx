import { Tabs } from 'expo-router';
import React from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
      name='checklist'
        options={{
          title: 'Check Lists',
          tabBarIcon: ({ color }) => <Octicons name="checklist" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Mantenimiento',
          tabBarIcon: ({ color }) => <MaterialIcons name="home-repair-service" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'QR',
          tabBarIcon: ({ color }) => <Ionicons name="qr-code" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
