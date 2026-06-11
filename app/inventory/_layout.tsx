import { Stack } from 'expo-router';

export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="systems" />
      <Stack.Screen name="[sistemaId]/equipamentos" />
      <Stack.Screen name="[equipamentoId]/equipos" />
      <Stack.Screen name="[equipamentoId]/add-equipo" />
      <Stack.Screen name="[equipoId]/index" />
      <Stack.Screen name="[equipoId]/detail" />
      <Stack.Screen name="[equipoId]/history" />
    </Stack>
  );
}
