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
  Modal,
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
  getDistinctUbicaciones,
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
  const [selectedUbicacion, setSelectedUbicacion] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedSubtipo, setSelectedSubtipo] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const {
    data: equipos,
    isLoading,
    isRefetching,
    error,
  } = useInventoryEquipos(propertyId, equipamentoId);

  const distinctUbicaciones = useMemo(() => {
    if (!equipos) return [];
    return getDistinctUbicaciones(equipos);
  }, [equipos]);

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

      if (selectedUbicacion) {
        if (e.ubicacion !== selectedUbicacion) return false;
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
  }, [equipos, searchText, selectedUbicacion, selectedTipo, selectedSubtipo]);

  const activeCategoryFilterCount = useMemo(() => {
    let count = 0;
    if (selectedUbicacion) count++;
    if (selectedTipo) count++;
    if (selectedSubtipo) count++;
    return count;
  }, [selectedUbicacion, selectedTipo, selectedSubtipo]);

  const hasActiveFilters =
    searchText.length > 0 || activeCategoryFilterCount > 0;

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedUbicacion('');
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
      </View>

      {/* Search Row + Filter Trigger Button */}
      <View style={styles.searchRow}>
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

        <Pressable
          style={({ pressed }) => [
            styles.filterTriggerBtn,
            activeCategoryFilterCount > 0 && styles.filterTriggerBtnActive,
            pressed && styles.pressed,
          ]}
          onPress={() => setIsFilterModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir opciones de filtro">
          <Ionicons
            name="funnel-outline"
            size={18}
            color={activeCategoryFilterCount > 0 ? '#FFFFFF' : '#475569'}
          />
          {activeCategoryFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {activeCategoryFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Main List Content */}
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

      {/* Fast, Clean Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsFilterModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsFilterModalOpen(false)}
          />
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}>
            {/* Handle Indicator */}
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Ionicons name="funnel-outline" size={20} color="#0F172A" />
                <Text style={styles.modalTitle}>Filtros</Text>
                {activeCategoryFilterCount > 0 && (
                  <View style={styles.modalHeaderBadge}>
                    <Text style={styles.modalHeaderBadgeText}>
                      {activeCategoryFilterCount} activo
                      {activeCategoryFilterCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setIsFilterModalOpen(false)}
                hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            {/* Modal Scrollable Body */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBodyContent}>
              {/* Ubicación Section */}
              {distinctUbicaciones.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Ubicación</Text>
                  <View style={styles.chipsGrid}>
                    <Pressable
                      style={[
                        styles.modalChip,
                        selectedUbicacion === '' && styles.modalChipActive,
                      ]}
                      onPress={() => setSelectedUbicacion('')}>
                      <Text
                        style={[
                          styles.modalChipText,
                          selectedUbicacion === '' &&
                            styles.modalChipTextActive,
                        ]}>
                        Todas
                      </Text>
                    </Pressable>
                    {distinctUbicaciones.map(ub => (
                      <Pressable
                        key={ub}
                        style={[
                          styles.modalChip,
                          selectedUbicacion === ub && styles.modalChipActive,
                        ]}
                        onPress={() =>
                          setSelectedUbicacion(
                            selectedUbicacion === ub ? '' : ub,
                          )
                        }>
                        <Text
                          style={[
                            styles.modalChipText,
                            selectedUbicacion === ub &&
                              styles.modalChipTextActive,
                          ]}>
                          {ub}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Tipo Section */}
              {distinctTipos.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Tipo de Equipo</Text>
                  <View style={styles.chipsGrid}>
                    <Pressable
                      style={[
                        styles.modalChip,
                        selectedTipo === '' && styles.modalChipActive,
                      ]}
                      onPress={() => setSelectedTipo('')}>
                      <Text
                        style={[
                          styles.modalChipText,
                          selectedTipo === '' && styles.modalChipTextActive,
                        ]}>
                        Todos
                      </Text>
                    </Pressable>
                    {distinctTipos.map(t => (
                      <Pressable
                        key={t}
                        style={[
                          styles.modalChip,
                          selectedTipo === t && styles.modalChipActive,
                        ]}
                        onPress={() =>
                          setSelectedTipo(selectedTipo === t ? '' : t)
                        }>
                        <Text
                          style={[
                            styles.modalChipText,
                            selectedTipo === t && styles.modalChipTextActive,
                          ]}>
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Subtipo Section */}
              {distinctSubtipos.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Subtipo</Text>
                  <View style={styles.chipsGrid}>
                    <Pressable
                      style={[
                        styles.modalChipSubtipo,
                        selectedSubtipo === '' && styles.modalChipSubtipoActive,
                      ]}
                      onPress={() => setSelectedSubtipo('')}>
                      <Text
                        style={[
                          styles.modalChipSubtipoText,
                          selectedSubtipo === '' &&
                            styles.modalChipSubtipoTextActive,
                        ]}>
                        Todos
                      </Text>
                    </Pressable>
                    {distinctSubtipos.map(st => (
                      <Pressable
                        key={st}
                        style={[
                          styles.modalChipSubtipo,
                          selectedSubtipo === st &&
                            styles.modalChipSubtipoActive,
                        ]}
                        onPress={() =>
                          setSelectedSubtipo(selectedSubtipo === st ? '' : st)
                        }>
                        <Text
                          style={[
                            styles.modalChipSubtipoText,
                            selectedSubtipo === st &&
                              styles.modalChipSubtipoTextActive,
                          ]}>
                          {st}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalResetBtn}
                onPress={handleClearFilters}>
                <Text style={styles.modalResetBtnText}>Limpiar</Text>
              </Pressable>
              <Pressable
                style={styles.modalApplyBtn}
                onPress={() => setIsFilterModalOpen(false)}>
                <Text style={styles.modalApplyBtnText}>
                  Ver resultados ({filteredEquipos.length})
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statsText: { fontSize: 13, color: '#64748B' },
  statsNumber: { fontWeight: '800', color: '#0F172A' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  filterTriggerBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterTriggerBtnActive: {
    backgroundColor: '#0891B2',
    borderColor: '#0891B2',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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

  /* Modal Bottom Sheet Styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderBadge: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  modalHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891B2',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    maxHeight: 400,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  modalSection: {
    gap: 10,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modalChipActive: {
    backgroundColor: '#0891B2',
    borderColor: '#0891B2',
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalChipTextActive: {
    color: '#FFFFFF',
  },
  modalChipSubtipo: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalChipSubtipoActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  modalChipSubtipoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalChipSubtipoTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalResetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0891B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
