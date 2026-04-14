import BuildingCard from '@/components/building-card';
import DefaultHeader from '@/components/default-header';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { syncService } from '@/services/sync';
import { DatabaseService } from '@/services/database';
import type { PropertyResponse as Property } from '@/types/api';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function AuditoriaIndexScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { canAudit, isAuditor } = useUserRole();

  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);

  const loadProperties = useCallback(async () => {
    if (!user?.id) {
      setProperties([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const localProperties = isAuditor
        ? await DatabaseService.getAssignedPropertiesForAuditor(user.id)
        : await DatabaseService.getLocalProperties();

      setProperties((localProperties || []) as Property[]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuditor, user?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (!canAudit) return;

    syncService.pullData().catch(error => {
      console.error('Audit background sync failed:', error);
    });
  }, [canAudit]);

  const filteredBuildings = useMemo(() => {
    if (!debouncedSearch.trim()) return properties;
    const query = normalizeText(debouncedSearch);
    return properties.filter(item => normalizeText(item.name).includes(query));
  }, [debouncedSearch, properties]);

  const handleBuildingSelect = useCallback(
    (building: Property) => {
      router.push({
        pathname: '/auditoria/history',
        params: {
          buildingId: String(building.id),
          buildingName: building.name,
          buildingAddress: building.address ?? '',
          buildingImageUrl: building.image_url ?? '',
        },
      });
    },
    [router],
  );

  const renderBuildingItem = useCallback(
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

  if (!canAudit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No tiene permisos para auditoria.
          </Text>
        </View>
      </SafeAreaView>
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
        <DefaultHeader
          title="Seleccione inmueble para auditoria"
          searchPlaceholder="Buscar inmuebles"
          onSearch={setSearchInput}
          shouldShowBackButton={true}
        />
      </View>

      <FlatList
        data={filteredBuildings}
        keyExtractor={item => String(item.id)}
        renderItem={renderBuildingItem}
        contentContainerStyle={styles.listWrapper}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay inmuebles asignados.</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerWrapper: {
    backgroundColor: '#fff',
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
