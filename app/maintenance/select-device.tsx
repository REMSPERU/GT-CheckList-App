import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import DefaultHeader from '@/components/default-header';
import MaintenanceCard from '@/components/maintenance-card';
import type { EquipamentoResponse } from '@/types/api';
// import { useEquipamentosByPropertyQuery } from '@/hooks/use-equipments-by-property-query';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

export default function SelectDeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);

  useEffect(() => {
    console.log('params.building:', params.building);
    if (params.building) {
      try {
        const parsedBuilding = JSON.parse(params.building as string);
        setBuilding(parsedBuilding);
        console.log('Parsed building:', parsedBuilding);
        console.log('Building ID:', parsedBuilding.id);
      } catch (e) {
        console.error('Error parsing building param:', e);
      }
    }
  }, [params.building]);

  const [equipamentos, setEquipamentos] = useState<EquipamentoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!building?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await DatabaseService.getEquipamentosByProperty(building.id);
      setEquipamentos(data as EquipamentoResponse[]);
    } catch (err) {
      console.error('Error loading equipments:', err);
      setError('Error al cargar equipamientos locales');
    } finally {
      setIsLoading(false);
    }
  }, [building?.id]);

  useEffect(() => {
    if (building?.id) {
      loadData();
    }
  }, [building, loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Trigger Sync
      await syncService.pullData();
      // 2. Reload local data
      await loadData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo sincronizar con el servidor.');
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData]);

  const handleEquipamentoPress = (equipamento: EquipamentoResponse) => {
    console.log('Selected equipamento:', equipamento);
    console.log('Building:', building);

    // Navegar a la pantalla de tableros eléctricos si el equipo es un tablero
    if (
      equipamento.abreviatura === 'TE' ||
      equipamento.nombre.toLowerCase().includes('tablero')
    ) {
      router.push({
        pathname: '/maintenance/electrical-panels',
        params: {
          building: JSON.stringify(building),
          equipamento: JSON.stringify(equipamento), // Pasar el equipamento seleccionado
        },
      });
    }
    // Añadir más lógica de navegación para otros tipos de equipos si es necesario
  };

  const getIconForEquipamento = (abreviatura: string) => {
    // Mapear abreviaturas de equipos a iconos
    const iconMap: Record<string, any> = {
      TE: 'stats-chart-outline',
      PT: 'construct-outline',
      LE: 'bulb-outline',
      ASC: 'arrow-up-outline',
    };
    return iconMap[abreviatura] || 'cube-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <DefaultHeader
          title={
            building ? `Mantenimiento - ${building.name}` : 'Mantenimiento'
          }
          searchPlaceholder="Buscar equipos"
        />

        {/* Content */}
        <View style={styles.listWrapper}>
          {isLoading && !isRefreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando localmente...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : equipamentos.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                No hay equipamientos disponibles para este inmueble
              </Text>
            </View>
          ) : (
            equipamentos.map(equipamento => (
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
