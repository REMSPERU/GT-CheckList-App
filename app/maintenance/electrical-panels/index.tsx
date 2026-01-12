import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';
import { EquipmentList } from '@/components/maintenance/EquipmentList';
import {
  EquipmentFilterModal,
  FilterState,
} from '@/components/maintenance/EquipmentFilterModal';
import type { TableroElectricoResponse } from '@/types/api';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

export default function ElectricalPanelsScreen() {
  const router = useRouter();
  const { building: buildingParam, equipamento: equipamentoParam } =
    useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);
  const [equipamento, setEquipamento] = useState<any>(null);
  const [panels, setPanels] = useState<TableroElectricoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterConfig, setFilterConfig] = useState<boolean | null>(null);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  // Temp state for panel type filter (electrical panels specific)
  const [tempFilterType, setTempFilterType] = useState<string | undefined>(
    undefined,
  );

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
      const data = await DatabaseService.getElectricalPanelsByProperty(
        building.id,
        {
          type: filterType,
          search: searchTerm,
          config: filterConfig,
          locations: filterLocations,
          equipamentoId: equipamento?.id,
        },
      );
      setPanels(data);
    } catch (err) {
      console.error('Error loading electrical panels:', err);
      setError(err as Error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    building?.id,
    equipamento?.id,
    filterType,
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

  // Extract unique locations from panels for filter options
  const availableLocations = useMemo(() => {
    return panels.map(panel => panel.ubicacion).filter(Boolean);
  }, [panels]);

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleSelection = (panelId: string) => {
    const newSelected = new Set(selectedPanelIds);
    if (newSelected.has(panelId)) {
      newSelected.delete(panelId);
      if (newSelected.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      newSelected.add(panelId);
      setIsSelectionMode(true);
    }
    setSelectedPanelIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPanelIds.size === panels.filter(p => p.config).length) {
      setSelectedPanelIds(new Set());
      setIsSelectionMode(false);
    } else {
      const allConfiguredIds = panels.filter(p => p.config).map(p => p.id);
      setSelectedPanelIds(new Set(allConfiguredIds));
      setIsSelectionMode(true);
    }
  };

  const handlePanelPress = (panel: TableroElectricoResponse) => {
    if (!panel.config) {
      router.push({
        pathname: '/maintenance/electrical-panels/configuration',
        params: {
          panel: JSON.stringify(panel),
          building: building ? JSON.stringify(building) : '',
        },
      });
      return;
    }

    router.push({
      pathname: '/maintenance/electrical-panels/detail-modal',
      params: {
        panel: JSON.stringify(panel),
      },
    });
  };

  const handleScheduleMaintenance = () => {
    router.push({
      pathname: '/maintenance/schedule-maintenance',
      params: {
        count: selectedPanelIds.size,
        ids: Array.from(selectedPanelIds).join(','),
        buildingName: building?.name,
      },
    });
  };

  const handleOpenFilter = () => {
    setTempFilterType(filterType);
    setShowFilterModal(true);
  };

  const handleApplyFilter = (filters: FilterState) => {
    setFilterConfig(filters.config);
    setFilterLocations(filters.locations);
    setFilterType(tempFilterType);
  };

  // Panel type filter chips (electrical panels specific)
  const PanelTypeFilter = (
    <View>
      <Text style={styles.filterLabel}>Tipo de Tablero</Text>
      <View style={styles.filterOptions}>
        {['Todos', 'Autosoportado', 'Distribucion'].map(label => {
          const typeValue = label === 'Todos' ? undefined : label.toUpperCase();
          const isActive = tempFilterType === typeValue;

          return (
            <TouchableOpacity
              key={label}
              style={[
                styles.filterOptionChip,
                isActive && styles.activeFilterOptionChip,
              ]}
              onPress={() => setTempFilterType(typeValue)}>
              <Text
                style={[
                  styles.filterOptionText,
                  isActive && styles.activeFilterOptionText,
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Fixed at top */}
      <DefaultHeader
        title="Tableros eléctricos"
        searchPlaceholder="Buscar por código o rótulo"
        onSearch={setSearchTerm}
        onFilterPress={handleOpenFilter}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* Building Info & Select All */}
        <View style={styles.buildingInfoRow}>
          <View style={styles.buildingInfo}>
            <Text style={styles.buildingName}>
              {building ? building.name : 'Centro Empresarial Leuro'}
            </Text>
          </View>

          {isSelectionMode && (
            <TouchableOpacity
              onPress={handleSelectAll}
              style={styles.selectAllButton}>
              <Text style={styles.selectAllText}>
                {selectedPanelIds.size === panels.filter(p => p.config).length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Panels List */}
        <View style={styles.panelsContainer}>
          <EquipmentList<TableroElectricoResponse>
            items={panels}
            isLoading={isLoading}
            isError={isError}
            errorMessage={
              error?.message || 'Error al cargar los tableros eléctricos'
            }
            emptyMessage="No hay tableros eléctricos disponibles con este filtro."
            loadingMessage="Cargando tableros eléctricos..."
            selectedIds={selectedPanelIds}
            onToggleSelection={toggleSelection}
            onItemPress={handlePanelPress}
            renderLabel={panel =>
              panel.equipment_detail?.rotulo || panel.codigo || 'N/A'
            }
            renderSubtitle={panel => panel.codigo || null}
          />
        </View>
      </ScrollView>

      {/* Floating Action Bar for Scheduling */}
      {isSelectionMode && selectedPanelIds.size > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={handleScheduleMaintenance}>
            <Text style={styles.fabText}>
              Programar Mantenimiento ({selectedPanelIds.size})
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
        title="Filtrar Tableros"
        availableLocations={availableLocations}
        additionalFilters={PanelTypeFilter}
      />
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
  panelsContainer: {
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
  // Filter chip styles for panel type (additional filters slot)
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterOptionChip: {
    backgroundColor: '#0891B2',
    borderColor: '#0891B2',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  activeFilterOptionText: {
    color: 'white',
  },
});
