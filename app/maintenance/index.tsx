import BuildingCard from '@/components/building-card';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FlatList,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DefaultHeader from '@/components/default-header';
import { useProperties } from '@/hooks/use-property-query';
import type { PropertyResponse as Property } from '@/types/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { syncService } from '@/services/sync';

const log = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default function MaintenanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const maintenanceType = params.type as string;
  const { data, isLoading, isError, refetch } = useProperties();
  const hasSynced = useRef(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 200);

    return () => clearTimeout(debounceTimeout);
  }, [searchInput]);

  // Safety check for missing maintenance type
  if (!maintenanceType) {
    // If we somehow got here without a type, defaulted to preventive or redirect
    // prevent infinite loading or broken state
  }

  // Background sync - doesn't block UI
  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    // Run sync in background without awaiting
    const backgroundSync = async () => {
      try {
        log('Background sync starting...');
        await syncService.pushData();
        await syncService.pullData();
        refetch();
        log('Background sync completed.');
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    };

    // Don't await - let it run in background
    backgroundSync();
  }, [refetch]);

  const handleBuildingSelect = useCallback(
    (building: Property) => {
      router.push({
        pathname: '/maintenance/select-device',
        params: {
          type: maintenanceType,
          buildingId: String(building.id),
          buildingName: building.name,
          buildingAddress: building.address ?? '',
          buildingImageUrl: building.image_url ?? '',
        },
      });
    },
    [router, maintenanceType],
  );

  const filteredBuildings = useMemo(() => {
    const items = data?.items ?? [];
    if (!debouncedSearch.trim()) return items;

    const query = normalizeText(debouncedSearch);
    return items.filter(building =>
      normalizeText(building.name).includes(query),
    );
  }, [data?.items, debouncedSearch]);

  const renderItem = useCallback(
    ({ item }: { item: Property }) => (
      <View style={styles.cardMargin}>
        <BuildingCard
          initial={item.name.charAt(0).toUpperCase()}
          name={item.name}
          onPress={() => handleBuildingSelect(item)}
        />
      </View>
    ),
    [handleBuildingSelect],
  );

  const keyExtractor = useCallback((item: Property) => String(item.id), []);

  // Only show loading on first load when there's no cached data
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
      {/* Header fijo */}
      <View style={styles.headerWrapper}>
        <DefaultHeader
          title="¿Qué inmueble deseas gestionar?"
          searchPlaceholder="Buscar inmuebles"
          onSearch={setSearchInput}
          shouldShowBackButton={true}
        />
      </View>

      <FlatList
        data={filteredBuildings}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listWrapper}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No se encontraron inmuebles</Text>
          </View>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}
