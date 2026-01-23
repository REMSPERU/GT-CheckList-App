import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import type { BaseEquipment } from '@/types/api';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { useUserRole } from '@/hooks/use-user-role';
import {
  createEquipment,
  softDeleteEquipment,
  generateEquipmentCode,
} from '@/services/db/equipment';
import { supabase } from '@/lib/supabase';

export default function EmergencyLightsScreen() {
  const router = useRouter();
  const { building: buildingParam, equipamento: equipamentoParam } =
    useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);
  const [equipamento, setEquipamento] = useState<any>(null);
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

  useEffect(() => {
    if (buildingParam) {
      try {
        const parsedBuilding = JSON.parse(buildingParam as string);
        setBuilding(parsedBuilding);
      } catch (e) {
        console.error('Error parsing building param:', e);
      }
    }
    if (equipamentoParam) {
      try {
        const parsedEquipamento = JSON.parse(equipamentoParam as string);
        setEquipamento(parsedEquipamento);
      } catch (e) {
        console.error('Error parsing equipamento param:', e);
      }
    }
  }, [buildingParam, equipamentoParam]);

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
      await syncService.pullData();
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

  const toggleSelection = (id: string) => {
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
  };

  const handleSelectAll = () => {
    if (selectedIds.size === lights.filter(l => l.config).length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      const allConfiguredIds = lights.filter(l => l.config).map(l => l.id);
      setSelectedIds(new Set(allConfiguredIds));
      setIsSelectionMode(true);
    }
  };

  const handleItemPress = (item: BaseEquipment) => {
    if (!item.config) {
      // Navigate to configuration screen (to be implemented)
      console.log('Navigate to configuration for:', item.id);
      return;
    }

    // Open edit modal for configured items
    handleOpenEditModal(item);
  };

  const handleScheduleMaintenance = () => {
    router.push({
      pathname: '/maintenance/schedule-maintenance',
      params: {
        count: selectedIds.size,
        ids: Array.from(selectedIds).join(','),
        buildingName: building?.name,
        buildingImageUrl: building?.image_url,
      },
    });
  };

  const handleOpenCreateModal = async () => {
    if (!building?.id || !equipamento?.id) return;
    try {
      const code = await generateEquipmentCode(building.id, 'LE');
      setInitialCode(code);
      setEditingLight(null);
      setShowLightModal(true);
    } catch (err) {
      console.error('Error generating code:', err);
      Alert.alert('Error', 'No se pudo generar el código');
    }
  };

  const handleOpenEditModal = (item: BaseEquipment) => {
    setEditingLight(item);
    setShowLightModal(true);
  };

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
        const { error } = await supabase
          .from('equipos')
          .update({
            ubicacion: data.ubicacion.trim(),
            detalle_ubicacion: data.detalle_ubicacion?.trim() || null,
            equipment_detail: equipmentDetail,
          })
          .eq('id', editingLight.id);
        if (error) throw error;
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

  const handleDeleteLight = (item: BaseEquipment) => {
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
  };

  const handleApplyFilter = (filters: FilterState) => {
    setFilterConfig(filters.config);
    setFilterLocations(filters.locations);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <DefaultHeader
          title="Luces de Emergencia"
          searchPlaceholder="Buscar por código"
          onSearch={setSearchTerm}
          onFilterPress={() => setShowFilterModal(true)}
        />

        {/* Building Info & Select All */}
        <View style={styles.buildingInfoRow}>
          <View style={styles.buildingInfo}>
            <Text style={styles.buildingName}>
              {building ? building.name : 'Cargando...'}
            </Text>
          </View>

          {isSelectionMode && (
            <TouchableOpacity
              onPress={handleSelectAll}
              style={styles.selectAllButton}>
              <Text style={styles.selectAllText}>
                {selectedIds.size === lights.filter(l => l.config).length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lights List */}
        <View style={styles.listContainer}>
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
            onToggleSelection={
              canScheduleMaintenance ? toggleSelection : undefined
            }
            onItemPress={handleItemPress}
            onLongPress={handleDeleteLight}
            renderLabel={item => item.codigo || 'N/A'}
          />
        </View>
      </ScrollView>

      {/* Floating Action Bar for Scheduling - only for SUPERVISOR/SUPERADMIN */}
      {canScheduleMaintenance && isSelectionMode && selectedIds.size > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={handleScheduleMaintenance}>
            <Text style={styles.fabText}>
              Programar Mantenimiento ({selectedIds.size})
            </Text>
            <Ionicons
              name="calendar"
              size={20}
              color="white"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
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
      />

      {/* Floating Add Button */}
      {!isSelectionMode && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenCreateModal}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
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
});
