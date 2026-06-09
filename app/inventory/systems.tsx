import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SystemCard } from '@/components/inventory/system-card';
import {
  inventoryKeys,
  useInventorySystems,
} from '@/hooks/use-inventory-query';
import { syncService } from '@/services/sync';
import { useQueryClient } from '@tanstack/react-query';
import type { InventorySistema } from '@/types/inventory';
import type { ListRenderItem } from 'react-native';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

export default function InventorySystemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);
  const propertyAddress = getSingleParam(params.propertyAddress);
  const propertyImageUrl = getSingleParam(params.propertyImageUrl);

  const {
    data: systems,
    isLoading,
    isRefetching,
    error,
  } = useInventorySystems(propertyId);

  const handleSystemPress = useCallback(
    (sistema: InventorySistema) => {
      router.push({
        pathname: '/inventory/[sistemaId]/equipamentos' as never,
        params: {
          sistemaId: sistema.id,
          sistemaNombre: sistema.nombre,
          propertyId,
          propertyName,
          propertyAddress,
          propertyImageUrl,
        },
      });
    },
    [router, propertyId, propertyName, propertyAddress, propertyImageUrl],
  );

  const onRefresh = useCallback(async () => {
    try {
      await syncService.triggerSync('inventory-systems-refresh', {
        force: true,
      });
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    } catch {
      Alert.alert('Error', 'No se pudo sincronizar con el servidor.');
    }
  }, [queryClient]);

  const renderItem = useCallback<ListRenderItem<InventorySistema>>(
    ({ item }) => <SystemCard item={item} onPress={handleSystemPress} />,
    [handleSystemPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Hero Header */}
      <View style={styles.headerContainer}>
        {propertyImageUrl ? (
          <Image
            source={{ uri: propertyImageUrl }}
            style={styles.headerImage}
            contentFit="cover"
            cachePolicy="disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={300}
          />
        ) : (
          <View style={styles.headerPlaceholder}>
            <Ionicons name="business" size={40} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <View style={styles.headerOverlay} />
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <View style={styles.inventarioChip}>
              <Ionicons name="archive-outline" size={13} color="#06B6D4" />
              <Text style={styles.inventarioChipText}>INVENTARIO</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {propertyName || 'Sistemas'}
            </Text>
            {propertyAddress ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {propertyAddress}
              </Text>
            ) : null}
          </View>
        </SafeAreaView>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="layers-outline" size={18} color="#0891B2" />
        <Text style={styles.sectionTitle}>Sistemas</Text>
        {systems && <Text style={styles.sectionCount}>({systems.length})</Text>}
      </View>

      {/* Content */}
      {isLoading && !systems ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Cargando sistemas...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar los sistemas</Text>
        </View>
      ) : (
        <FlatList
          data={systems ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            (!systems || systems.length === 0) && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="layers-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                No hay sistemas registrados para este inmueble.
              </Text>
              <Text style={styles.emptyHint}>
                Verifica que el inmueble tenga equipamentos asignados.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerContainer: {
    minHeight: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  headerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F2027',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerContent: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'flex-end',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.84 },
  headerTitleContainer: {
    paddingLeft: 56,
    paddingRight: 16,
    gap: 4,
  },
  inventarioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6,182,212,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  inventarioChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06B6D4',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
