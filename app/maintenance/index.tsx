import BuildingCard from '@/components/building-card';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DefaultHeader from '@/components/default-header';
import { useProperties } from '@/hooks/use-property-query';
import type { PropertyResponse as Property } from '@/types/api';
import { useEffect, useState } from 'react';
import { syncService } from '@/services/sync';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerWrapper: {
    backgroundColor: '#fff',
    paddingBottom: 0,
  },
  listWrapper: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  cardMargin: {
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function MaintenanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const maintenanceType = params.type as string;
  const { data, isLoading, isError, refetch } = useProperties();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const performAutoSync = async () => {
      try {
        console.log('Auto-sync starting...');
        setIsSyncing(true);
        // 1. Upload pending work
        await syncService.pushData();
        // 2. Download fresh data
        await syncService.pullData();
        // 3. Refresh properties query
        await refetch();
        console.log('Auto-sync completed.');
      } catch (error) {
        console.error('Auto-sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    performAutoSync();
  }, [refetch]);

  function handleBuildingSelect({
    building,
    maintenanceType,
  }: {
    building: Property;
    maintenanceType: string;
  }) {
    console.log('Selected:', building.name);
    router.push({
      pathname: '/maintenance/select-device',
      params: {
        type: maintenanceType,
        building: JSON.stringify(building),
      },
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Error al cargar los inmuebles</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.headerWrapper}>
          <DefaultHeader
            title="¿Qué inmueble deseas gestionar?"
            searchPlaceholder="Buscar inmuebles"
            shouldShowBackButton={true}
          />
        </View>

        {isSyncing && (
          <View style={{ padding: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              Sincronizando datos...
            </Text>
          </View>
        )}

        {/* Lista de inmuebles */}
        <View style={styles.listWrapper}>
          {data?.items.map(building => (
            <View key={building.id} style={styles.cardMargin}>
              <BuildingCard
                initial={building.name.charAt(0).toUpperCase()}
                name={building.name}
                onPress={() =>
                  handleBuildingSelect({ building, maintenanceType })
                }
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
