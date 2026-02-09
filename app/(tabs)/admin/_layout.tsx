import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-property" />
      <Stack.Screen name="assign-roles" />
      <Stack.Screen name="assign-providers" />
    </Stack>
  );
}
