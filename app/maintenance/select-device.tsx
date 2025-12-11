import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import DefaultHeader from '@/components/default-header';
import MaintenanceCard from '@/components/maintenance-card';
import type { EquipamentoResponse } from '@/types/api';
import { useEquipamentosByPropertyQuery } from '@/hooks/use-equipments-by-property-query';

export default function SelectDeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);

  useEffect(() => {
    if (params.building) {
      try {
        setBuilding(JSON.parse(params.building as string));
      } catch { }
    }
  }, [params.building]);

  const { data, isLoading, isError, error } = useEquipamentosByPropertyQuery(building?.id);

  const equipamentos = data?.items || [];

  const handleEquipamentoPress = (equipamento: EquipamentoResponse) => {
    console.log('Selected equipamento:', equipamento);
    console.log('Building:', building);

    // Navigate based on equipamento type
    // You can customize this logic based on your needs
    if (equipamento.abreviatura === 'TE' || equipamento.nombre.toLowerCase().includes('tablero')) {
      router.push({
        pathname: '/maintenance/electrical-panels',
        params: {
          building: JSON.stringify(building),
          equipamento: JSON.stringify(equipamento)
        }
      });
    }
    // Add more navigation logic for other equipment types as needed
  };

  const getIconForEquipamento = (abreviatura: string) => {
    // Map equipment abbreviations to icons
    const iconMap: Record<string, any> = {
      'TE': 'stats-chart-outline',
      'PT': 'construct-outline',
      'LE': 'bulb-outline',
      'ASC': 'arrow-up-outline',
    };
    return iconMap[abreviatura] || 'cube-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <DefaultHeader
          title={building ? `Mantenimiento - ${building.name}` : 'Mantenimiento'}
          searchPlaceholder="Buscar equipos"
        />

        {/* Content */}
        <View style={styles.listWrapper}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando equipamientos...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error?.message || 'Error al cargar los equipamientos'}</Text>
            </View>
          ) : equipamentos.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No hay equipamientos disponibles para este inmueble</Text>
            </View>
          ) : (
            equipamentos.map((equipamento) => (
              <MaintenanceCard
                key={equipamento.id}
                icon={getIconForEquipamento(equipamento.abreviatura)}
                title={equipamento.nombre}
                onPress={() => handleEquipamentoPress(equipamento)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listWrapper: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
