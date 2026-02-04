import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { EquipmentList } from '@/components/maintenance/EquipmentList';
import {
  EquipmentFilterModal,
  FilterState,
} from '@/components/maintenance/EquipmentFilterModal';
import type { TableroElectricoResponse } from '@/types/api';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { syncQueue } from '@/services/sync-queue';
import { useUserRole } from '@/hooks/use-user-role';

// Constants
const REFRESH_TIMEOUT_MS = 10000; // 10 seconds timeout for refresh

export default function ElectricalPanelsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // Force re-render when sync queue changes
  const [, setSyncQueueVersion] = useState(0);

  // Role-based permissions
  const { canScheduleMaintenance } = useUserRole();

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

  // Subscribe to sync queue changes to update UI when sync status changes
  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(() => {
      setSyncQueueVersion(v => v + 1);
      // Data will reload via the loadData effect
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when screen comes into focus (e.g., after configuration)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  /**
   * Pull-to-refresh with timeout protection
   * - Timeout after 10 seconds to prevent hanging on slow/unstable internet
   * - Always loads from local DB regardless of sync success
   */
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      // Race between pullData and timeout
      await Promise.race([
        syncService.pullData(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Refresh timeout')),
            REFRESH_TIMEOUT_MS,
          ),
        ),
      ]);
      console.log('[REFRESH] Sync completed successfully');
    } catch (err: any) {
      // Timeout or network error - proceed with local data
      if (err.message === 'Refresh timeout') {
        console.log('[REFRESH] Timeout reached, using local data');
      } else {
        console.log('[REFRESH] Sync failed, using local data:', err.message);
      }
    } finally {
      // Always reload from local DB (single source of truth)
      await loadData();
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
    // Only allow selection if user can schedule maintenance
    if (!canScheduleMaintenance) return;

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
        buildingImageUrl: building?.image_url,
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

  /**
   * Manual retry sync for a specific panel
   */
  const handleRetrySync = useCallback(async (panelId: string) => {
    console.log('[RETRY] Manual retry requested for panel:', panelId);
    const success = await syncQueue.retryItem(panelId, 'panel_config');
    if (success) {
      console.log('[RETRY] Sync successful, reloading data...');
    }
    // Data will be reloaded via syncQueue subscription
  }, []);

  /**
   * Check if panel is in auto-retry mode
   */
  const isAutoRetrying = useCallback((panelId: string): boolean => {
    return syncQueue.isAutoRetrying(panelId, 'panel_config');
  }, []);

  /**
   * Check if panel needs manual retry
   */
  const needsManualRetry = useCallback((panelId: string): boolean => {
    return syncQueue.needsManualRetry(panelId, 'panel_config');
  }, []);

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with Building Image */}
      <View style={styles.headerContainer}>
        {building?.image_url ? (
          <Image
            source={{ uri: building.image_url }}
            style={styles.headerImage}
            contentFit="cover"
            cachePolicy="disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={300}
          />
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
        <View style={styles.headerOverlay} />
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {building?.name || 'Tableros Eléctricos'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={18} color={Colors.light.tint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código o rótulo"
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            (filterConfig !== null ||
              filterLocations.length > 0 ||
              filterType) &&
              styles.filterButtonActive,
          ]}
          onPress={handleOpenFilter}>
          <Feather
            name="filter"
            size={18}
            color={
              filterConfig !== null || filterLocations.length > 0 || filterType
                ? '#fff'
                : '#4B5563'
            }
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* Select All Row */}
        {isSelectionMode && (
          <View style={styles.selectAllRow}>
            <TouchableOpacity
              onPress={handleSelectAll}
              style={styles.selectAllButton}>
              <Text style={styles.selectAllText}>
                {selectedPanelIds.size === panels.filter(p => p.config).length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
            onToggleSelection={
              canScheduleMaintenance ? toggleSelection : undefined
            }
            onItemPress={handlePanelPress}
            renderLabel={panel =>
              panel.equipment_detail?.rotulo || panel.codigo || 'N/A'
            }
            renderSubtitle={panel => panel.codigo || null}
            onRetrySync={handleRetrySync}
            isAutoRetrying={isAutoRetrying}
            needsManualRetry={needsManualRetry}
          />
        </View>
      </ScrollView>

      {/* Floating Action Bar for Scheduling - only for SUPERVISOR/SUPERADMIN */}
      {canScheduleMaintenance &&
        isSelectionMode &&
        selectedPanelIds.size > 0 && (
          <View style={[styles.fabContainer, { bottom: 24 + insets.bottom }]}>
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
  // Header styles
  headerContainer: {
    height: 130,
    position: 'relative',
    overflow: 'hidden',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  headerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1F2937',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Search Bar styles
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.light.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  // Select All Row
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  selectAllButton: {
    padding: 8,
  },
  selectAllText: {
    color: '#0891B2',
    fontWeight: '600',
    fontSize: 14,
  },
  // Panels list
  panelsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
