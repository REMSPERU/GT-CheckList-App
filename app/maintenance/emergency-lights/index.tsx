import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, Text, Pressable, Alert } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';
import { EquipmentList } from '@/components/maintenance/EquipmentList';
import {
  EquipmentFilterModal,
  FilterState,
} from '@/components/maintenance/EquipmentFilterModal';
import {
  EmergencyLightModal,
  EmergencyLightFormData,
} from '@/components/maintenance/emergency-lights/EmergencyLightModal';
import type {
  BaseEquipment,
  EquipamentoResponse,
  EquipmentHistoryEntry,
} from '@/types/api';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { useUserRole } from '@/hooks/use-user-role';
import {
  createEquipment,
  updateEquipment,
  softDeleteEquipment,
  generateEquipmentCode,
} from '@/services/db/equipment';
import { supabaseEquipmentHistoryService } from '@/services/supabase-equipment-history.service';

interface BuildingParam {
  id: string;
  name: string;
  address?: string;
  image_url?: string;
}

function parseJsonParam<T>(value: string | string[] | undefined): T | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (typeof rawValue !== 'string') return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const log = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export default function EmergencyLightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<BuildingParam | null>(null);
  const [equipamento, setEquipamento] = useState<EquipamentoResponse | null>(
    null,
  );
  const [lights, setLights] = useState<BaseEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterConfig, setFilterConfig] = useState<boolean | null>(null);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  // Modal state
  const [showLightModal, setShowLightModal] = useState(false);
  const [editingLight, setEditingLight] = useState<BaseEquipment | null>(null);
  const [initialCode, setInitialCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [historyItems, setHistoryItems] = useState<EquipmentHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    const buildingId = getSingleParam(params.buildingId);
    const buildingName = getSingleParam(params.buildingName);
    const buildingAddress = getSingleParam(params.buildingAddress);
    const buildingImageUrl = getSingleParam(params.buildingImageUrl);

    const equipamentoId = getSingleParam(params.equipamentoId);
    const equipamentoNombre = getSingleParam(params.equipamentoNombre);
    const equipamentoFrecuencia = getSingleParam(params.equipamentoFrecuencia);
    const equipamentoAbreviatura = getSingleParam(
      params.equipamentoAbreviatura,
    );

    if (buildingId && buildingName) {
      setBuilding({
        id: buildingId,
        name: buildingName,
        address: buildingAddress,
        image_url: buildingImageUrl,
      });
    } else {
      const parsedBuilding = parseJsonParam<BuildingParam>(params.building);
      if (parsedBuilding) {
        setBuilding(parsedBuilding);
      }
    }

    if (equipamentoId && equipamentoNombre) {
      setEquipamento({
        id: equipamentoId,
        nombre: equipamentoNombre,
        frecuencia: equipamentoFrecuencia ?? 'MENSUAL',
        abreviatura: equipamentoAbreviatura ?? '',
      } as EquipamentoResponse);
    } else {
      const parsedEquipamento = parseJsonParam<EquipamentoResponse>(
        params.equipamento,
      );
      if (parsedEquipamento) {
        setEquipamento(parsedEquipamento);
      }
    }
  }, [
    params.building,
    params.buildingAddress,
    params.buildingId,
    params.buildingImageUrl,
    params.buildingName,
    params.equipamento,
    params.equipamentoAbreviatura,
    params.equipamentoFrecuencia,
    params.equipamentoId,
    params.equipamentoNombre,
  ]);

  const loadData = useCallback(async () => {
    if (!building?.id) return;
    setIsLoading(true);
    setError(null);
    setIsError(false);
    try {
      const data = await DatabaseService.getEquipmentByProperty(building.id, {
        search: searchTerm,
        config: filterConfig,
        locations: filterLocations,
        equipamentoId: equipamento?.id,
      });
      setLights(data as BaseEquipment[]);
    } catch (err) {
      console.error('Error loading emergency lights:', err);
      setError(err as Error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    building?.id,
    equipamento?.id,
    searchTerm,
    filterConfig,
    filterLocations,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Race between pullData and timeout
      await new Promise<void>(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Refresh timeout'));
        }, 10000); // 10s timeout

        try {
          await syncService.pullData();
          clearTimeout(timeoutId);
          resolve();
        } catch (err) {
          clearTimeout(timeoutId);
          reject(err);
        }
      });
      await loadData();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData]);

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Role-based permissions
  const { canScheduleMaintenance } = useUserRole();

  const toggleSelection = useCallback(
    (id: string) => {
      // Only allow selection if user can schedule maintenance
      if (!canScheduleMaintenance) return;

      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
        if (newSelected.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSelected.add(id);
        setIsSelectionMode(true);
      }
      setSelectedIds(newSelected);
    },
    [canScheduleMaintenance, selectedIds],
  );

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === lights.filter(l => l.config).length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      const allConfiguredIds = lights.filter(l => l.config).map(l => l.id);
      setSelectedIds(new Set(allConfiguredIds));
      setIsSelectionMode(true);
    }
  }, [lights, selectedIds.size]);

  const handleItemPress = (item: BaseEquipment) => {
    if (!item.config) {
      // Navigate to configuration screen (to be implemented)
      log('Navigate to configuration for:', item.id);
      return;
    }

    // Open edit modal for configured items
    handleOpenEditModal(item);
  };

  const handleScheduleMaintenance = useCallback(() => {
    router.push({
      pathname: '/maintenance/schedule-maintenance',
      params: {
        count: selectedIds.size,
        ids: Array.from(selectedIds).join(','),
        buildingName: building?.name,
        buildingImageUrl: building?.image_url,
      },
    });
  }, [building?.image_url, building?.name, router, selectedIds]);

  const handleOpenCreateModal = async () => {
    if (!building?.id || !equipamento?.id) return;
    try {
      const code = await generateEquipmentCode(building.id, 'LE');
      setInitialCode(code);
      setEditingLight(null);
      setHistoryItems([]);
      setIsHistoryLoading(false);
      setShowLightModal(true);
    } catch (err) {
      console.error('Error generating code:', err);
      Alert.alert('Error', 'No se pudo generar el código');
    }
  };

  const loadLightHistory = useCallback(async (equipmentId: string) => {
    setIsHistoryLoading(true);
    try {
      const history = await supabaseEquipmentHistoryService.getByEquipmentId(
        equipmentId,
        15,
      );
      setHistoryItems(history);
    } catch (err) {
      console.error('Error loading light history:', err);
      setHistoryItems([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const handleOpenEditModal = useCallback(
    (item: BaseEquipment) => {
      setEditingLight(item);
      setHistoryItems([]);
      setShowLightModal(true);
      loadLightHistory(item.id);
    },
    [loadLightHistory],
  );

  const handleSaveLight = async (data: EmergencyLightFormData) => {
    if (!building?.id || !equipamento?.id) return;
    if (!data.codigo.trim() || !data.ubicacion.trim()) {
      Alert.alert('Campos requeridos', 'Por favor complete todos los campos');
      return;
    }

    setIsSaving(true);
    try {
      // Build equipment_detail JSON with marca and modelo
      const equipmentDetail = {
        marca: data.marca?.trim() || null,
        modelo: data.modelo?.trim() || null,
      };

      if (editingLight) {
        // Update existing light
        await updateEquipment(editingLight.id, {
          ubicacion: data.ubicacion.trim(),
          detalle_ubicacion: data.detalle_ubicacion?.trim() || null,
          equipment_detail: equipmentDetail,
        });
        Alert.alert('Éxito', 'Luz actualizada correctamente');
      } else {
        // Create new light
        await createEquipment({
          id_property: building.id,
          id_equipamento: equipamento.id,
          codigo: data.codigo.trim(),
          ubicacion: data.ubicacion.trim(),
          detalle_ubicacion: data.detalle_ubicacion?.trim() || undefined,
          equipment_detail: equipmentDetail,
          estatus: 'ACTIVO',
          config: data.config,
        });
        Alert.alert('Éxito', 'Luz de emergencia creada correctamente');
      }

      setShowLightModal(false);
      await syncService.pullData();
      await loadData();
    } catch (err) {
      console.error('Error saving light:', err);
      Alert.alert('Error', 'No se pudo guardar la luz de emergencia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLight = useCallback(
    (item: BaseEquipment) => {
      Alert.alert(
        'Desactivar Luz',
        `¿Está seguro de desactivar "${item.codigo}"? Esta acción no se puede deshacer.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desactivar',
            style: 'destructive',
            onPress: async () => {
              try {
                await softDeleteEquipment(item.id);
                await syncService.pullData();
                await loadData();
                Alert.alert('Éxito', 'Luz desactivada correctamente');
              } catch (err) {
                console.error('Error deactivating light:', err);
                Alert.alert('Error', 'No se pudo desactivar la luz');
              }
            },
          },
        ],
      );
    },
    [loadData],
  );

  const handleApplyFilter = useCallback((filters: FilterState) => {
    setFilterConfig(filters.config);
    setFilterLocations(filters.locations);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DefaultHeader
        title="Luces de Emergencia"
        searchPlaceholder="Buscar por código"
        onSearch={setSearchTerm}
        onFilterPress={() => setShowFilterModal(true)}
      />

      <EquipmentList<BaseEquipment>
        items={lights}
        isLoading={isLoading}
        isError={isError}
        errorMessage={
          error?.message || 'Error al cargar las luces de emergencia'
        }
        emptyMessage="No hay luces de emergencia disponibles con este filtro."
        loadingMessage="Cargando luces de emergencia..."
        selectedIds={selectedIds}
        onToggleSelection={canScheduleMaintenance ? toggleSelection : undefined}
        onItemPress={handleItemPress}
        onLongPress={handleDeleteLight}
        renderLabel={item => item.codigo || 'N/A'}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <>
            {/* Building Info & Select All */}
            <View style={styles.buildingInfoRow}>
              <View style={styles.buildingInfo}>
                <Text style={styles.buildingName}>
                  {building ? building.name : 'Cargando...'}
                </Text>
              </View>

              {isSelectionMode && (
                <Pressable
                  onPress={handleSelectAll}
                  style={({ pressed }) => [
                    styles.selectAllButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button">
                  <Text style={styles.selectAllText}>
                    {selectedIds.size === lights.filter(l => l.config).length
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos'}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 116 + insets.bottom },
        ]}
      />

      {/* Floating Action Bar for Scheduling - only for SUPERVISOR/SUPERADMIN */}
      {canScheduleMaintenance && isSelectionMode && selectedIds.size > 0 && (
        <View style={[styles.fabContainer, { bottom: 16 + insets.bottom }]}>
          <Pressable
            style={styles.fabButton}
            onPress={handleScheduleMaintenance}
            accessibilityRole="button">
            <Text style={styles.fabText}>
              Programar Mantenimiento ({selectedIds.size})
            </Text>
            <Ionicons
              name="calendar"
              size={20}
              color="white"
              style={styles.fabIcon}
            />
          </Pressable>
        </View>
      )}

      {/* Filter Modal */}
      <EquipmentFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilter}
        initialFilters={{ config: filterConfig, locations: filterLocations }}
        title="Filtrar Luces"
      />

      {/* Create/Edit Light Modal */}
      <EmergencyLightModal
        visible={showLightModal}
        onClose={() => setShowLightModal(false)}
        onSave={handleSaveLight}
        editItem={editingLight}
        initialCode={initialCode}
        isLoading={isSaving}
        historyItems={historyItems}
        isHistoryLoading={isHistoryLoading}
      />

      {/* Floating Add Button */}
      {!isSelectionMode && (
        <Pressable
          style={[styles.addButton, { bottom: 96 + insets.bottom }]}
          onPress={handleOpenCreateModal}
          accessibilityRole="button">
          <Ionicons name="add" size={28} color="white" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  buildingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
  },
  buildingInfo: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectAllButton: {
    padding: 8,
  },
  selectAllText: {
    color: '#0891B2',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingTop: 0,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  fabButton: {
    flexDirection: 'row',
    backgroundColor: '#0891B2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fabIcon: {
    marginLeft: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0891B2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pressed: {
    opacity: 0.84,
  },
});
