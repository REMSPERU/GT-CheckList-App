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
import { EquipamentoCard } from '@/components/inventory/equipamento-card';
import {
  useInventoryEquipamentos,
  inventoryKeys,
} from '@/hooks/use-inventory-query';
import { syncService } from '@/services/sync';
import { useQueryClient } from '@tanstack/react-query';
import type { InventoryEquipamento } from '@/types/inventory';
import type { ListRenderItem } from 'react-native';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

export default function InventoryEquipamentosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const sistemaId = getSingleParam(params.sistemaId);
  const sistemaNombre = getSingleParam(params.sistemaNombre);
  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);
  const propertyAddress = getSingleParam(params.propertyAddress);
  const propertyImageUrl = getSingleParam(params.propertyImageUrl);

  const {
    data: equipamentos,
    isLoading,
    isRefetching,
    error,
  } = useInventoryEquipamentos(propertyId, sistemaId);

  const handleEquipamentoPress = useCallback(
    (equipamento: InventoryEquipamento) => {
      router.push({
        pathname: '/inventory/[equipamentoId]/equipos' as never,
        params: {
          equipamentoId: equipamento.id,
          equipamentoNombre: equipamento.nombre,
          equipamentoAbreviatura: equipamento.abreviatura,
          sistemaNombre,
          propertyId,
          propertyName,
          propertyAddress,
          propertyImageUrl,
        },
      });
    },
    [
      router,
      sistemaNombre,
      propertyId,
      propertyName,
      propertyAddress,
      propertyImageUrl,
    ],
  );

  const onRefresh = useCallback(async () => {
    try {
      await syncService.triggerSync('inventory-equipamentos-refresh', {
        force: true,
      });
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    } catch {
      Alert.alert('Error', 'No se pudo sincronizar con el servidor.');
    }
  }, [queryClient]);

  const renderItem = useCallback<ListRenderItem<InventoryEquipamento>>(
    ({ item }) => (
      <EquipamentoCard item={item} onPress={handleEquipamentoPress} />
    ),
    [handleEquipamentoPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {propertyName}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sistemaNombre || 'Sistema'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Ionicons name="cube-outline" size={16} color="#0891B2" />
        <Text style={styles.sectionTitle}>Tipos de Equipo</Text>
        {equipamentos && (
          <Text style={styles.sectionCount}>({equipamentos.length})</Text>
        )}
      </View>

      {/* Content */}
      {isLoading && !equipamentos ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Cargando equipamentos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar los equipamentos</Text>
        </View>
      ) : (
        <FlatList
          data={equipamentos ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            (!equipamentos || equipamentos.length === 0) && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                No hay tipos de equipo en este sistema.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.75 },
  headerTextWrap: { flex: 1 },
  breadcrumb: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingText: { fontSize: 15, color: '#64748B', marginTop: 8 },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center' },
});
