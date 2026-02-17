import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';
import { EquipmentList } from '@/components/maintenance/EquipmentList';
import {
  EquipmentFilterModal,
  FilterState,
} from '@/components/maintenance/EquipmentFilterModal';
import { GroundingWellModal } from '@/components/maintenance/grounding-wells/GroundingWellModal';
import type { BaseEquipment } from '@/types/api';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { useUserRole } from '@/hooks/use-user-role';

export default function GroundingWellsScreen() {
  const router = useRouter();
  const { building: buildingParam, equipamento: equipamentoParam } =
    useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);
  const [equipamento, setEquipamento] = useState<any>(null);
  const [wells, setWells] = useState<BaseEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterConfig, setFilterConfig] = useState<boolean | null>(null);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BaseEquipment | null>(null);

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
      setWells(data as BaseEquipment[]);
    } catch (err) {
      console.error('Error loading grounding wells:', err);
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
    if (selectedIds.size === wells.filter(l => l.config).length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      const allConfiguredIds = wells.filter(l => l.config).map(l => l.id);
      setSelectedIds(new Set(allConfiguredIds));
      setIsSelectionMode(true);
    }
  };

  const handleItemPress = (item: BaseEquipment) => {
    if (!item.config) {
      console.log('Navigate to configuration for:', item.id);
      return;
    }
    setSelectedItem(item);
    setShowModal(true);
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

  const handleApplyFilter = (filters: FilterState) => {
    setFilterConfig(filters.config);
    setFilterLocations(filters.locations);
  };

  return (
    <SafeAreaView style={styles.container}>
      <DefaultHeader
        title="Pozos a Tierra"
        searchPlaceholder="Buscar por código"
        onSearch={setSearchTerm}
        onFilterPress={() => setShowFilterModal(true)}
      />

      <EquipmentList<BaseEquipment>
        items={wells}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message || 'Error al cargar los pozos a tierra'}
        emptyMessage="No hay pozos a tierra disponibles con este filtro."
        loadingMessage="Cargando pozos a tierra..."
        selectedIds={selectedIds}
        onToggleSelection={canScheduleMaintenance ? toggleSelection : undefined}
        onItemPress={handleItemPress}
        // Removed onLongPress (edit/delete)
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
                <TouchableOpacity
                  onPress={handleSelectAll}
                  style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>
                    {selectedIds.size === wells.filter(l => l.config).length
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 100 }}
      />

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
        title="Filtrar Pozos"
      />

      {/* Read-Only Modal */}
      <GroundingWellModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        item={selectedItem}
      />

      {/* Removed Floating Add Button */}
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
});
