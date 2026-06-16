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
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, useEffect, memo, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  inventoryKeys,
  useInventoryChecklistSystems,
  useAllInventoryEquipamentos,
} from '@/hooks/use-inventory-query';
import { syncService } from '@/services/sync';
import { useQueryClient } from '@tanstack/react-query';
import type {
  SistemaChecklistResponse,
  EquipamentoResponse,
} from '@/types/api';
import type { ListRenderItem } from 'react-native';

// Obtiene icono, color de icono y color de fondo según la abreviatura del equipamento
function getEquipamentoStyle(abreviatura: string) {
  const stylesMap: Record<
    string,
    { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
  > = {
    TBELEC: { icon: 'flash-outline', color: '#EAB308', bg: '#FEF9C3' },     // Yellow/Amber for electrical panels
    LUZ: { icon: 'bulb-outline', color: '#F97316', bg: '#FFEDD5' },        // Orange for emergency lights
    PAT: { icon: 'earth-outline', color: '#10B981', bg: '#D1FAE5' },       // Green for grounding wells
    CHAI: { icon: 'snow-outline', color: '#3B82F6', bg: '#DBEAFE' },       // Blue for air chillers
    CHAG: { icon: 'water-outline', color: '#06B6D4', bg: '#ECFEFF' },      // Cyan for water chillers
    TOE: { icon: 'sync-outline', color: '#0891B2', bg: '#E0F7FA' },        // Cyan for cooling towers
    ABL: { icon: 'filter-outline', color: '#6366F1', bg: '#EEF2FF' },      // Indigo for softeners
    BBA: { icon: 'speedometer-outline', color: '#EC4899', bg: '#FCE7F3' }, // Pink for water pumps
    SPLIT: { icon: 'thermometer-outline', color: '#3B82F6', bg: '#DBEAFE' }, // Blue
    FCU: { icon: 'refresh-outline', color: '#10B981', bg: '#D1FAE5' },     // Greenish
    UMA: { icon: 'cube-outline', color: '#6B7280', bg: '#F3F4F6' },        // Gray
  };

  return (
    stylesMap[abreviatura] ?? {
      icon: 'cube-outline',
      color: '#0F766E',
      bg: '#CCFBF1',
    }
  );
}

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

interface InventoryEquipamentoRowProps {
  item: EquipamentoResponse;
  systemNombre: string;
  onPress: (equipamento: EquipamentoResponse, systemNombre: string) => void;
}

const InventoryEquipamentoRow = memo(function InventoryEquipamentoRow({
  item,
  systemNombre,
  onPress,
}: InventoryEquipamentoRowProps) {
  const handlePress = useCallback(() => {
    onPress(item, systemNombre);
  }, [item, systemNombre, onPress]);

  const styleConfig = getEquipamentoStyle(item.abreviatura);

  return (
    <Pressable
      style={({ pressed }) => [styles.equipmentRow, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir equipos de ${item.nombre}`}>
      <View style={[styles.equipmentIconWrap, { backgroundColor: styleConfig.bg }]}>
        <Ionicons
          name={styleConfig.icon}
          size={20}
          color={styleConfig.color}
        />
      </View>
      <View style={styles.equipmentRowBody}>
        <Text style={styles.equipmentRowTitle}>{item.nombre}</Text>
        <Text style={styles.equipmentRowSubtitle}>
          {item.equipos_count ?? 0} equipo{item.equipos_count !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </Pressable>
  );
});

interface InventorySystemCardProps {
  item: SistemaChecklistResponse;
  isExpanded: boolean;
  onToggle: (systemId: string) => void;
  onPressEquipamento: (
    equipamento: EquipamentoResponse,
    systemNombre: string,
  ) => void;
}

const InventorySystemCard = memo(function InventorySystemCard({
  item,
  isExpanded,
  onToggle,
  onPressEquipamento,
}: InventorySystemCardProps) {
  const handleToggle = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <View style={[styles.systemCard, isExpanded && styles.systemCardExpanded]}>
      <Pressable
        style={({ pressed }) => [
          styles.systemHeader,
          pressed && styles.pressed,
        ]}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={`Abrir sistema ${item.nombre}`}
        accessibilityHint="Despliega los equipamientos del sistema">
        <View style={styles.systemIconWrap}>
          <Ionicons name="layers-outline" size={22} color="#0891B2" />
        </View>
        <View style={styles.systemHeaderBody}>
          <Text style={styles.systemTitle}>{item.nombre}</Text>
          <Text style={styles.systemSubtitle}>
            {item.equipamentos.length} tipo
            {item.equipamentos.length !== 1 ? 's' : ''} · {item.equipos_count}{' '}
            equipo{item.equipos_count !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.systemChevronWrap}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#64748B"
          />
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.equipmentPanel}>
          {item.equipamentos.map(equipamento => (
            <InventoryEquipamentoRow
              key={equipamento.id}
              item={equipamento}
              systemNombre={item.nombre}
              onPress={onPressEquipamento}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

export default function InventorySystemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);
  const propertyAddress = getSingleParam(params.propertyAddress);
  const propertyImageUrl = getSingleParam(params.propertyImageUrl);

  const [expandedSystemId, setExpandedSystemId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSearchText, setModalSearchText] = useState('');

  const {
    data: systems,
    isLoading,
    isRefetching,
    error,
  } = useInventoryChecklistSystems(propertyId);

  const { data: allEquipamentos } = useAllInventoryEquipamentos();

  const groupedAllEquipamentos = useMemo(() => {
    if (!allEquipamentos) return [];

    const q = normalizeSearch(modalSearchText);
    const filtered = allEquipamentos.filter(
      eq =>
        normalizeSearch(eq.nombre).includes(q) ||
        normalizeSearch(eq.abreviatura).includes(q) ||
        normalizeSearch(eq.sistema_nombre).includes(q)
    );

    const groups: Record<string, typeof filtered> = {};
    for (const eq of filtered) {
      const sysName = eq.sistema_nombre || 'Sin Sistema';
      if (!groups[sysName]) {
        groups[sysName] = [];
      }
      groups[sysName].push(eq);
    }

    return Object.entries(groups)
      .map(([name, items]) => ({
        sistema_nombre: name,
        items,
      }))
      .sort((a, b) => a.sistema_nombre.localeCompare(b.sistema_nombre));
  }, [allEquipamentos, modalSearchText]);

  const filteredSystems = useMemo(() => {
    if (!systems) return [];
    const q = normalizeSearch(searchText);
    if (!q) return systems;

    return systems
      .map(system => {
        const systemNombreMatches = normalizeSearch(system.nombre).includes(q);
        const filteredEquipamentos = system.equipamentos.filter(
          eq =>
            normalizeSearch(eq.nombre).includes(q) ||
            normalizeSearch(eq.abreviatura).includes(q)
        );

        if (systemNombreMatches || filteredEquipamentos.length > 0) {
          const equipmentsToUse = filteredEquipamentos.length > 0
            ? filteredEquipamentos
            : system.equipamentos;

          const sumEquipos = equipmentsToUse.reduce((acc, eq) => acc + (eq.equipos_count ?? 0), 0);

          return {
            ...system,
            equipamentos: equipmentsToUse,
            equipos_count: sumEquipos,
          };
        }
        return null;
      })
      .filter((sys): sys is SistemaChecklistResponse => sys !== null);
  }, [systems, searchText]);

  const handleEquipamentoPress = useCallback(
    (equipamento: EquipamentoResponse, systemNombre: string) => {
      router.push({
        pathname: '/inventory/[equipamentoId]/equipos' as never,
        params: {
          equipamentoId: equipamento.id,
          equipamentoNombre: equipamento.nombre,
          equipamentoAbreviatura: equipamento.abreviatura,
          sistemaNombre: systemNombre,
          propertyId,
          propertyName,
          propertyAddress,
          propertyImageUrl,
        },
      });
    },
    [router, propertyId, propertyName, propertyAddress, propertyImageUrl],
  );

  const handleAddNewEquipamentoPress = useCallback(
    (equipamento: EquipamentoResponse) => {
      router.push({
        pathname: '/inventory/[equipamentoId]/add-equipo' as never,
        params: {
          equipamentoId: equipamento.id,
          equipamentoNombre: equipamento.nombre,
          equipamentoAbreviatura: equipamento.abreviatura,
          propertyId,
          propertyName,
        },
      });
    },
    [router, propertyId, propertyName],
  );

  const handleToggleSystem = useCallback((systemId: string) => {
    setExpandedSystemId(current => (current === systemId ? null : systemId));
  }, []);

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

  const renderItem = useCallback<ListRenderItem<SistemaChecklistResponse>>(
    ({ item }) => (
      <InventorySystemCard
        item={item}
        isExpanded={searchText.trim().length > 0 ? true : expandedSystemId === item.id}
        onToggle={handleToggleSystem}
        onPressEquipamento={handleEquipamentoPress}
      />
    ),
    [expandedSystemId, handleToggleSystem, handleEquipamentoPress, searchText],
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
        {systems && (
          <Text style={styles.sectionCount}>
            ({filteredSystems.length})
          </Text>
        )}
      </View>

      {/* Search */}
      {systems && systems.length > 0 && (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar sistema o tipo..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      )}

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
          data={filteredSystems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            (!filteredSystems || filteredSystems.length === 0) && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="layers-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {searchText
                  ? `Sin resultados para "${searchText}"`
                  : 'No hay sistemas registrados para este inmueble.'}
              </Text>
              {!searchText && (
                <Text style={styles.emptyHint}>
                  Verifica que el inmueble tenga equipamentos asignados.
                </Text>
              )}
            </View>
          }
        />
      )}

      {/* FAB - Agregar tipo de equipo */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => {
          setModalSearchText('');
          setModalVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Agregar tipo de equipo">
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Modal para seleccionar tipo de equipo */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Tipo de Equipo</Text>
              <Pressable
                style={({ pressed }) => [styles.modalCloseButton, pressed && styles.pressed]}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Cerrar modal">
                <Ionicons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>

            {/* Modal Search */}
            <View style={styles.modalSearchWrap}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar tipo de equipo..."
                placeholderTextColor="#94A3B8"
                value={modalSearchText}
                onChangeText={setModalSearchText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {modalSearchText.length > 0 && (
                <Pressable onPress={() => setModalSearchText('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            {/* Modal List */}
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {groupedAllEquipamentos.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="cube-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.modalEmptyText}>No se encontraron tipos de equipo</Text>
                </View>
              ) : (
                groupedAllEquipamentos.map(group => (
                  <View key={group.sistema_nombre} style={styles.modalSystemGroup}>
                    <View style={styles.modalSystemHeader}>
                      <Ionicons name="layers-outline" size={14} color="#0891B2" />
                      <Text style={styles.modalSystemTitle}>
                        {group.sistema_nombre.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modalEquipmentList}>
                      {group.items.map(eq => {
                        const styleConfig = getEquipamentoStyle(eq.abreviatura);
                        return (
                          <Pressable
                            key={eq.id}
                            style={({ pressed }) => [
                              styles.modalEquipmentRow,
                              pressed && styles.pressed,
                            ]}
                            onPress={() => {
                              setModalVisible(false);
                              handleAddNewEquipamentoPress({
                                id: eq.id,
                                nombre: eq.nombre,
                                abreviatura: eq.abreviatura,
                                frecuencia: eq.frecuencia,
                              });
                            }}>
                            <View
                              style={[
                                styles.modalEquipmentIconWrap,
                                { backgroundColor: styleConfig.bg },
                              ]}>
                              <Ionicons
                                name={styleConfig.icon}
                                size={18}
                                color={styleConfig.color}
                              />
                            </View>
                            <View style={styles.modalEquipmentRowBody}>
                              <Text style={styles.modalEquipmentRowTitle}>
                                {eq.nombre}
                              </Text>
                              {eq.abreviatura ? (
                                <Text style={styles.modalEquipmentRowSubtitle}>
                                  {eq.abreviatura}
                                </Text>
                              ) : null}
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color="#94A3B8"
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    gap: 12,
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
  systemCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  systemCardExpanded: {
    borderColor: '#CBD5E1',
  },
  systemHeader: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  systemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  systemHeaderBody: {
    flex: 1,
  },
  systemTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '800',
  },
  systemSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  systemChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentPanel: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 8,
    gap: 7,
  },
  equipmentRow: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  equipmentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentRowBody: {
    flex: 1,
  },
  equipmentRowTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  equipmentRowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  modalSystemGroup: {
    marginBottom: 20,
  },
  modalSystemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  modalSystemTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  modalEquipmentList: {
    gap: 8,
  },
  modalEquipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalEquipmentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEquipmentRowBody: {
    flex: 1,
  },
  modalEquipmentRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalEquipmentRowSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0891B2',
    marginTop: 1,
  },
});
