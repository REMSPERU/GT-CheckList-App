import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { EquipoCard } from '@/components/inventory/equipo-card';
import {
  useInventoryEquipos,
  inventoryKeys,
} from '@/hooks/use-inventory-query';
import { syncService } from '@/services/sync';
import { useQueryClient } from '@tanstack/react-query';
import type { InventoryEquipo } from '@/types/inventory';
import type { ListRenderItem } from 'react-native';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

function normalizeSearch(val: string) {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function InventoryEquiposScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const equipamentoId = getSingleParam(params.equipamentoId);
  const equipamentoNombre = getSingleParam(params.equipamentoNombre);
  const equipamentoAbreviatura = getSingleParam(params.equipamentoAbreviatura);
  const sistemaNombre = getSingleParam(params.sistemaNombre);
  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);

  const [searchText, setSearchText] = useState('');

  const {
    data: equipos,
    isLoading,
    isRefetching,
    error,
  } = useInventoryEquipos(propertyId, equipamentoId);

  const filteredEquipos = useMemo(() => {
    if (!equipos) return [];
    const q = normalizeSearch(searchText);
    if (!q) return equipos;
    return equipos.filter(e => normalizeSearch(e.codigo).includes(q));
  }, [equipos, searchText]);

  const handleEquipoPress = useCallback(
    (equipo: InventoryEquipo) => {
      router.push({
        pathname: '/inventory/[equipoId]' as never,
        params: {
          equipoId: equipo.id,
          propertyId,
          propertyName,
          equipamentoId,
          equipamentoNombre,
          equipamentoAbreviatura,
        },
      });
    },
    [
      router,
      propertyId,
      propertyName,
      equipamentoId,
      equipamentoNombre,
      equipamentoAbreviatura,
    ],
  );

  const handleAddEquipo = useCallback(() => {
    router.push({
      pathname: '/inventory/[equipamentoId]/add-equipo' as never,
      params: {
        equipamentoId,
        equipamentoNombre,
        equipamentoAbreviatura,
        propertyId,
        propertyName,
        sistemaNombre,
      },
    });
  }, [
    router,
    equipamentoId,
    equipamentoNombre,
    equipamentoAbreviatura,
    propertyId,
    propertyName,
    sistemaNombre,
  ]);

  const onRefresh = useCallback(async () => {
    try {
      await syncService.triggerSync('inventory-equipos-refresh', {
        force: true,
      });
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    } catch {
      Alert.alert('Error', 'No se pudo sincronizar con el servidor.');
    }
  }, [queryClient]);

  const renderItem = useCallback<ListRenderItem<InventoryEquipo>>(
    ({ item }) => <EquipoCard item={item} onPress={handleEquipoPress} />,
    [handleEquipoPress],
  );

  const activeCount = equipos?.filter(e => e.estatus === 'ACTIVO').length ?? 0;

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
            {propertyName} · {sistemaNombre}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {equipamentoNombre || 'Equipos'}
          </Text>
        </View>
        {equipamentoAbreviatura ? (
          <View style={styles.abreviaturaBadge}>
            <Text style={styles.abreviaturaText}>{equipamentoAbreviatura}</Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          <Text style={styles.statsNumber}>{equipos?.length ?? 0}</Text> equipos
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Content */}
      {isLoading && !equipos ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Cargando equipos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Error al cargar los equipos</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEquipos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            filteredEquipos.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name="hardware-chip-outline"
                size={48}
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>
                {searchText
                  ? `Sin resultados para "${searchText}"`
                  : 'No hay equipos de este tipo registrados.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Agregar equipo */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={handleAddEquipo}
        accessibilityRole="button"
        accessibilityLabel="Agregar nuevo equipo">
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
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
  breadcrumb: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  abreviaturaBadge: {
    backgroundColor: '#ECFEFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFFAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  abreviaturaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0891B2',
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statsText: { fontSize: 13, color: '#64748B' },
  statsNumber: { fontWeight: '800', color: '#0F172A' },
  statsSep: { color: '#CBD5E1', fontWeight: '300' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
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
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: { transform: [{ scale: 0.92 }], opacity: 0.9 },
});
