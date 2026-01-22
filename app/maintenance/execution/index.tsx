import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getEquipmentRoute } from '@/constants/equipment-routes';

/**
 * Execution Router
 *
 * Entry point for maintenance execution that routes to the appropriate
 * execution flow based on equipment type.
 *
 * Params:
 * - panelId: The equipment ID
 * - maintenanceId: The scheduled maintenance ID (optional)
 * - equipmentType: The equipment type name (from equipamentos.nombre)
 */
export default function ExecutionRouter() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId?: string;
    equipmentType?: string;
    building?: string;
    maintenanceType?: string;
    propertyId?: string;
    propertyName?: string;
  }>();

  const { panelId, maintenanceId, equipmentType } = params;

  console.log('ExecutionRouter Params:', {
    panelId,
    maintenanceId,
    equipmentType,
    building: params.building ? 'Present' : 'Missing',
    maintenanceType: params.maintenanceType,
  });

  const routeConfig = getEquipmentRoute(equipmentType);

  useEffect(() => {
    // Navigate to the appropriate route with params
    router.replace({
      pathname: routeConfig.route as any,
      params: {
        panelId,
        maintenanceId,
        equipmentType,
        building: params.building,
        maintenanceType: params.maintenanceType, // Pass generic maintenance type
        propertyId: params.propertyId,
        propertyName: params.propertyName,
      },
    });
  }, [
    panelId,
    maintenanceId,
    equipmentType,
    routeConfig.route,
    router,
    params.building,
    params.maintenanceType,
    params.propertyId,
    params.propertyName,
  ]);

  // Show loading while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#06B6D4" />
      <Text style={styles.text}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
