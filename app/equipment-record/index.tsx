import BuildingCard from '@/components/building-card';
import { useRouter } from 'expo-router';
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
import { useEffect, useRef } from 'react';
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

export default function EquipmentRecordSelectionScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useProperties();
  const hasSynced = useRef(false);

  // Background sync
  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    const backgroundSync = async () => {
      try {
        await syncService.pushData();
        await syncService.pullData();
        refetch();
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    };

    backgroundSync();
  }, [refetch]);

  function handleBuildingSelect(building: Property) {
    router.push({
      pathname: '/equipment-record/[propertyId]',
      params: {
        propertyId: building.id,
        propertyName: building.name,
      },
    });
  }

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !data) {
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
            title="Seleccionar Inmueble"
            searchPlaceholder="Buscar inmuebles"
            shouldShowBackButton={true}
          />
        </View>

        {/* Lista de inmuebles */}
        <View style={styles.listWrapper}>
          {data?.items.map(building => (
            <View key={building.id} style={styles.cardMargin}>
              <BuildingCard
                initial={building.name.charAt(0).toUpperCase()}
                name={building.name}
                onPress={() => handleBuildingSelect(building)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
