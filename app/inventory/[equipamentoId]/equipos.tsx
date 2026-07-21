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
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  extractEquipoTipo,
  extractEquipoSubtipo,
  getDistinctTipos,
  getDistinctSubtipos,
} from '@/utils/inventory-filter-helpers';

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
  const insets = useSafeAreaInsets();

  const equipamentoId = getSingleParam(params.equipamentoId);
  const rawEquipamentoNombre = getSingleParam(params.equipamentoNombre);
  const equipamentoAbreviatura = getSingleParam(params.equipamentoAbreviatura);
  const sistemaNombre = getSingleParam(params.sistemaNombre);
  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);

  const isAllEquipos = equipamentoId === 'all';
  const equipamentoNombre = isAllEquipos
    ? 'Todos los Activos'
    : rawEquipamentoNombre || 'Equipos';

  const [searchText, setSearchText] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedSubtipo, setSelectedSubtipo] = useState('');

  const {
    data: equipos,
    isLoading,
    isRefetching,
    error,
  } = useInventoryEquipos(propertyId, equipamentoId);

  const distinctTipos = useMemo(() => {
    if (!equipos) return [];
    return getDistinctTipos(equipos);
  }, [equipos]);

  const distinctSubtipos = useMemo(() => {
    if (!equipos) return [];
    return getDistinctSubtipos(equipos, selectedTipo);
  }, [equipos, selectedTipo]);

  useEffect(() => {
    if (selectedSubtipo && !distinctSubtipos.includes(selectedSubtipo)) {
      setSelectedSubtipo('');
    }
  }, [distinctSubtipos, selectedSubtipo]);

  const filteredEquipos = useMemo(() => {
    if (!equipos) return [];
    const q = normalizeSearch(searchText);

    return equipos.filter(e => {
      if (q) {
        const matchCodigo = normalizeSearch(e.codigo).includes(q);
        const matchUbicacion = normalizeSearch(e.ubicacion).includes(q);
        const matchDetalle = e.detalle_ubicacion
          ? normalizeSearch(e.detalle_ubicacion).includes(q)
          : false;
        const matchEquipamento = e.equipamento_nombre
          ? normalizeSearch(e.equipamento_nombre).includes(q)
          : false;
        if (
          !matchCodigo &&
          !matchUbicacion &&
          !matchDetalle &&
          !matchEquipamento
        ) {
          return false;
        }
      }

      if (selectedTipo) {
        const eqTipo = extractEquipoTipo(
          e.equipment_detail,
          e.equipamento_nombre,
        );
        if (eqTipo !== selectedTipo) return false;
      }

      if (selectedSubtipo) {
        const eqSubtipo = extractEquipoSubtipo(e.equipment_detail);
        if (eqSubtipo !== selectedSubtipo) return false;
      }

      return true;
    });
  }, [equipos, searchText, selectedTipo, selectedSubtipo]);

  const hasActiveFilters =
    searchText.length > 0 || selectedTipo !== '' || selectedSubtipo !== '';

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedTipo('');
    setSelectedSubtipo('');
  }, []);

  const handleEquipoPress = useCallback(
    (equipo: InventoryEquipo) => {
      router.push({
        pathname: '/inventory/[equipoId]' as never,
        params: {
          equipoId: equipo.id,
          propertyId,
          propertyName,
          equipamentoId: equipo.id_equipamento || equipamentoId,
          equipamentoNombre: equipo.equipamento_nombre || equipamentoNombre,
          equipamentoAbreviatura:
            equipo.equipamento_abreviatura || equipamentoAbreviatura,
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
        equipamentoId: isAllEquipos ? '' : equipamentoId,
        equipamentoNombre,
        equipamentoAbreviatura,
        propertyId,
        propertyName,
        sistemaNombre,
      },
    });
  }, [
    router,
    isAllEquipos,
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
            {propertyName} {sistemaNombre ? `· ${sistemaNombre}` : ''}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {equipamentoNombre}
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
          <Text style={styles.statsNumber}>{filteredEquipos.length}</Text>
          {filteredEquipos.length !== (equipos?.length ?? 0) ? (
            <Text style={styles.statsText}> de {equipos?.length ?? 0}</Text>
          ) : null}{' '}
          equipos
        </Text>
        {hasActiveFilters && (
          <Pressable
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.pressed,
            ]}
            onPress={handleClearFilters}>
            <Ionicons name="funnel-outline" size={12} color="#EF4444" />
            <Text style={styles.clearButtonText}>Limpiar filtros</Text>
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código, ubicación o tipo..."
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

      {/* Filter Chips - Tipo */}
      {distinctTipos.length > 0 && (
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <Text style={styles.chipLabel}>Tipo:</Text>
            <Pressable
              style={[styles.chip, selectedTipo === '' && styles.chipActive]}
              onPress={() => setSelectedTipo('')}>
              <Text
                style={[
                  styles.chipText,
                  selectedTipo === '' && styles.chipTextActive,
                ]}>
                Todos
              </Text>
            </Pressable>
            {distinctTipos.map(t => (
              <Pressable
                key={t}
                style={[styles.chip, selectedTipo === t && styles.chipActive]}
                onPress={() => setSelectedTipo(selectedTipo === t ? '' : t)}>
                <Text
                  style={[
                    styles.chipText,
                    selectedTipo === t && styles.chipTextActive,
                  ]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filter Chips - Subtipo */}
      {distinctSubtipos.length > 0 && (
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}>
            <Text style={styles.chipLabel}>Subtipo:</Text>
            <Pressable
              style={[
                styles.chipSubtipo,
                selectedSubtipo === '' && styles.chipSubtipoActive,
              ]}
              onPress={() => setSelectedSubtipo('')}>
              <Text
                style={[
                  styles.chipSubtipoText,
                  selectedSubtipo === '' && styles.chipSubtipoTextActive,
                ]}>
                Todos
              </Text>
            </Pressable>
            {distinctSubtipos.map(st => (
              <Pressable
                key={st}
                style={[
                  styles.chipSubtipo,
                  selectedSubtipo === st && styles.chipSubtipoActive,
                ]}
                onPress={() =>
                  setSelectedSubtipo(selectedSubtipo === st ? '' : st)
                }>
                <Text
                  style={[
                    styles.chipSubtipoText,
                    selectedSubtipo === st && styles.chipSubtipoTextActive,
                  ]}>
                  {st}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

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
                {hasActiveFilters
                  ? 'Sin resultados para los filtros seleccionados.'
                  : 'No hay equipos registrados.'}
              </Text>
              {hasActiveFilters && (
                <Pressable
                  style={styles.resetFiltersBtn}
                  onPress={handleClearFilters}>
                  <Text style={styles.resetFiltersBtnText}>
                    Limpiar filtros
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* FAB - Agregar equipo */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 32 },
          pressed && styles.fabPressed,
        ]}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statsText: { fontSize: 13, color: '#64748B' },
  statsNumber: { fontWeight: '800', color: '#0F172A' },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filtersSection: {
    marginBottom: 4,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 3,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 2,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: '#0891B2',
    borderColor: '#0891B2',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipSubtipo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipSubtipoActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  chipSubtipoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chipSubtipoTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  resetFiltersBtn: {
    marginTop: 8,
    backgroundColor: '#06B6D4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFiltersBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
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
