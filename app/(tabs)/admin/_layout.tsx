import { Redirect, Stack } from 'expo-router';
import { useUserRole } from '@/hooks/use-user-role';
import React from 'react';

export default function AdminLayout() {
  const { isAdmin, isLoaded } = useUserRole();
  if (!isLoaded) return null;
  if (!isAdmin) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-property" />
      <Stack.Screen name="assign-roles" />
      <Stack.Screen name="assign-providers" />
      <Stack.Screen name="assign-auditor-properties" />
    </Stack>
  );
}
