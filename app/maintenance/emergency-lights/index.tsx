import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';
import { EquipmentList } from '@/components/maintenance/EquipmentList';
import type { BaseEquipment } from '@/types/api';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

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

  // Advanced Filters State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterConfig, setFilterConfig] = useState<boolean | null>(null);
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  // Temp state for modal
  const [tempFilterConfig, setTempFilterConfig] = useState<boolean | null>(
    null,
  );
  const [tempFilterLocations, setTempFilterLocations] = useState<string[]>([]);

  const handleOpenFilter = () => {
    setTempFilterConfig(filterConfig);
    setTempFilterLocations(filterLocations);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setFilterConfig(tempFilterConfig);
    setFilterLocations(tempFilterLocations);
    setShowFilterModal(false);
  };

  const handleResetFilter = () => {
    setTempFilterConfig(null);
    setTempFilterLocations([]);
  };

  const toggleLocation = (loc: string) => {
    setTempFilterLocations(prev => {
      const newLocs = new Set(prev);
      if (newLocs.has(loc)) {
        newLocs.delete(loc);
      } else {
        newLocs.add(loc);
      }
      return Array.from(newLocs);
    });
  };

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

  const toggleSelection = (id: string) => {
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

    // Navigate to detail screen (to be implemented)
    console.log('Navigate to detail for:', item.id);
  };

  const handleScheduleMaintenance = () => {
    router.push({
      pathname: '/maintenance/schedule-maintenance',
      params: {
        count: selectedIds.size,
        ids: Array.from(selectedIds).join(','),
        buildingName: building?.name,
      },
    });
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
          onFilterPress={handleOpenFilter}
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
            onToggleSelection={toggleSelection}
            onItemPress={handleItemPress}
            renderLabel={item => item.codigo || 'N/A'}
          />
        </View>
      </ScrollView>

      {/* Floating Action Bar for Scheduling */}
      {isSelectionMode && selectedIds.size > 0 && (
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Luces</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Config Status Filter */}
              <Text style={styles.filterLabel}>Estado de Configuración</Text>
              <View style={styles.filterOptions}>
                {[
                  { label: 'Todos', value: null },
                  { label: 'Configurados', value: true },
                  { label: 'No Configurados', value: false },
                ].map(option => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.filterOptionChip,
                      tempFilterConfig === option.value &&
                        styles.activeFilterOptionChip,
                    ]}
                    onPress={() => setTempFilterConfig(option.value)}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilterConfig === option.value &&
                          styles.activeFilterOptionText,
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location Filter */}
              <Text style={styles.filterLabel}>Ubicación</Text>

              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.locationCheckboxItem,
                    tempFilterLocations.length === 0 &&
                      styles.locationCheckboxSelected,
                  ]}
                  onPress={() => setTempFilterLocations([])}>
                  <Ionicons
                    name={
                      tempFilterLocations.length === 0
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={20}
                    color={
                      tempFilterLocations.length === 0 ? '#0891B2' : '#9CA3AF'
                    }
                  />
                  <Text
                    style={[
                      styles.locationCheckboxText,
                      tempFilterLocations.length === 0 &&
                        styles.activeLocationCheckboxText,
                    ]}>
                    Todos
                  </Text>
                </TouchableOpacity>
              </View>

              {building?.basement > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                    Sótanos
                  </Text>
                  <View style={styles.locationGrid}>
                    {Array.from(
                      { length: building.basement },
                      (_, i) => `Sótano ${i + 1}`,
                    ).map(loc => {
                      const isSelected = tempFilterLocations.includes(loc);
                      return (
                        <TouchableOpacity
                          key={loc}
                          style={[
                            styles.locationCheckboxItem,
                            isSelected && styles.locationCheckboxSelected,
                          ]}
                          onPress={() => toggleLocation(loc)}>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isSelected ? '#0891B2' : '#9CA3AF'}
                          />
                          <Text
                            style={[
                              styles.locationCheckboxText,
                              isSelected && styles.activeLocationCheckboxText,
                            ]}>
                            {loc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {building?.floor > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                    Pisos
                  </Text>
                  <View style={styles.locationGrid}>
                    {Array.from(
                      { length: building.floor },
                      (_, i) => `Piso ${i + 1}`,
                    ).map(loc => {
                      const isSelected = tempFilterLocations.includes(loc);
                      return (
                        <TouchableOpacity
                          key={loc}
                          style={[
                            styles.locationCheckboxItem,
                            isSelected && styles.locationCheckboxSelected,
                          ]}
                          onPress={() => toggleLocation(loc)}>
                          <Ionicons
                            name={isSelected ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isSelected ? '#0891B2' : '#9CA3AF'}
                          />
                          <Text
                            style={[
                              styles.locationCheckboxText,
                              isSelected && styles.activeLocationCheckboxText,
                            ]}>
                            {loc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Extras: Azotea */}
              <View>
                <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                  Otros
                </Text>
                <TouchableOpacity
                  style={[
                    styles.locationCheckboxItem,
                    tempFilterLocations.includes('Azotea') &&
                      styles.locationCheckboxSelected,
                  ]}
                  onPress={() => toggleLocation('Azotea')}>
                  <Ionicons
                    name={
                      tempFilterLocations.includes('Azotea')
                        ? 'checkbox'
                        : 'square-outline'
                    }
                    size={20}
                    color={
                      tempFilterLocations.includes('Azotea')
                        ? '#0891B2'
                        : '#9CA3AF'
                    }
                  />
                  <Text
                    style={[
                      styles.locationCheckboxText,
                      tempFilterLocations.includes('Azotea') &&
                        styles.activeLocationCheckboxText,
                    ]}>
                    Azotea
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetFilter}>
                <Text style={styles.resetButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilter}>
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    marginBottom: 24,
  },
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
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#0891B2',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationCheckboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: '45%',
    marginBottom: 4,
  },
  locationCheckboxSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0891B2',
  },
  locationCheckboxText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  activeLocationCheckboxText: {
    color: '#0891B2',
  },
});
