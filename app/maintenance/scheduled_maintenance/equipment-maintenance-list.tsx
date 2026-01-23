import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceByProperty } from '@/hooks/use-maintenance';
import { MaintenanceStatusEnum } from '@/types/api';

export default function EquipmentMaintenanceListScreen() {
  const router = useRouter();
  const { propertyId, scheduledDate, propertyName } = useLocalSearchParams<{
    propertyId: string;
    scheduledDate?: string;
    propertyName?: string;
  }>();

  // State
  const [activeTab, setActiveTab] = useState<'Preventivo' | 'Correctivo'>(
    'Preventivo',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  // When coming from session screen, show all statuses by default
  const [selectedStatus, setSelectedStatus] = useState<string>(
    scheduledDate ? '' : MaintenanceStatusEnum.NO_INICIADO,
  );

  // Fetch Data
  const {
    data: maintenanceData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useMaintenanceByProperty(propertyId);

  // Derived Filters Options
  const { locations } = useMemo(() => {
    const locs = new Set<string>();
    const typs = new Set<string>();

    maintenanceData.forEach((item: any) => {
      // Apply date filter for deriving filter options
      if (scheduledDate && item.dia_programado !== scheduledDate) return;

      if (item.equipos?.ubicacion) locs.add(item.equipos.ubicacion);
      if (item.equipos?.equipamentos?.nombre)
        typs.add(item.equipos.equipamentos.nombre);
    });

    return {
      locations: Array.from(locs),
    };
  }, [maintenanceData, scheduledDate]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return maintenanceData.filter((item: any) => {
      // 0. Filter by Scheduled Date (if provided from session screen)
      if (scheduledDate && item.dia_programado !== scheduledDate) return false;

      // 1. Tab Filter (Tipo Mantenimiento)
      // Database stores 'Preventivo' or 'Correctivo' (case sensitive usually)
      if (item.tipo_mantenimiento !== activeTab) return false;

      // 2. Status Filter
      if (selectedStatus && item.estatus !== selectedStatus) return false;

      // 3. Search Filter (Only Code)
      const searchLower = searchQuery.toLowerCase();
      const code = item.equipos?.codigo?.toLowerCase() || '';

      if (!code.includes(searchLower)) return false;

      // 4. Dynamic Filters
      if (selectedLocation && item.equipos?.ubicacion !== selectedLocation)
        return false;

      return true;
    });
  }, [
    maintenanceData,
    activeTab,
    searchQuery,
    selectedLocation,
    selectedStatus,
    scheduledDate,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case MaintenanceStatusEnum.NO_INICIADO:
        return '#6B7280';
      case MaintenanceStatusEnum.PENDIENTE:
        return '#F59E0B';
      case MaintenanceStatusEnum.EN_PROGRESO:
        return '#3B82F6';
      case MaintenanceStatusEnum.FINALIZADO:
        return '#10B981';
      case MaintenanceStatusEnum.CANCELADO:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Format scheduled date for display
  const displayScheduledDate = useMemo(() => {
    if (!scheduledDate) return null;

    // Parse date - handle both "YYYY-MM-DD" and ISO formats
    let dateObj: Date;
    if (typeof scheduledDate === 'string' && scheduledDate.includes('T')) {
      dateObj = new Date(scheduledDate);
    } else {
      dateObj = new Date(scheduledDate + 'T12:00:00');
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return scheduledDate; // fallback to raw string
    }

    const formatted = dateObj.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [scheduledDate]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MaintenanceHeader
          title="Mantenimiento programado"
          iconName="home-repair-service"
        />

        {/* Date/Property Info Badge */}
        {(displayScheduledDate || propertyName) && (
          <View style={styles.infoBadgeContainer}>
            {displayScheduledDate && (
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={16} color="#06B6D4" />
                <Text style={styles.dateBadgeText}>{displayScheduledDate}</Text>
              </View>
            )}
          </View>
        )}

        {/* Search & Filter Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por código"
              placeholderTextColor="#BDC1CA"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedLocation && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(true)}>
            <Feather
              name="filter"
              size={20}
              color={selectedLocation ? '#fff' : '#4B5563'}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Preventivo' && styles.activeTab]}
            onPress={() => setActiveTab('Preventivo')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'Preventivo' && styles.activeTabText,
              ]}>
              Preventivo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'Correctivo' && styles.activeTabWhite,
            ]}
            onPress={() => setActiveTab('Correctivo')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'Correctivo' && styles.activeTabTextDark,
              ]}>
              Correctivo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Filters Display */}
        {selectedLocation && (
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 10,
              paddingHorizontal: 4,
            }}>
            {selectedLocation && (
              <TouchableOpacity
                onPress={() => setSelectedLocation(null)}
                style={styles.chip}>
                <Text style={styles.chipText}>{selectedLocation}</Text>
                <Feather name="x" size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* List */}
        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }>
            {filteredData.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: '#6B7280' }}>
                  No se encontraron mantenimientos.
                </Text>
              </View>
            ) : (
              filteredData.map((item: any, index: number) => {
                const equipment = item.equipos || {};

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.card,
                      // index === 0 && activeTab === 'Preventivo' && styles.highlightedCard // Removed highlight logic for now
                    ]}
                    onPress={() => {
                      // Navigate to response detail if finalized, otherwise directly to execution
                      if (item.estatus === MaintenanceStatusEnum.FINALIZADO) {
                        router.push({
                          pathname:
                            '/maintenance/scheduled_maintenance/maintenance-response-detail',
                          params: {
                            maintenanceId: item.id,
                          },
                        });
                      } else {
                        router.push({
                          pathname: '/maintenance/execution',
                          params: {
                            panelId: equipment.id,
                            maintenanceId: item.id,
                            equipmentType: equipment.equipamentos?.nombre,
                            propertyId: propertyId,
                            propertyName: propertyName,
                            maintenanceType: item.tipo_mantenimiento,
                          },
                        });
                      }
                    }}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderInfo}>
                        {equipment.equipment_detail?.rotulo && (
                          <Text style={styles.cardRotulo}>
                            {equipment.equipment_detail.rotulo}
                          </Text>
                        )}
                        <Text style={styles.cardCode}>
                          {equipment.codigo || 'S/N'}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#9CA3AF"
                      />
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(item.estatus) + '20',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(item.estatus) },
                        ]}>
                        {item.estatus}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color="#4B5563"
                      />
                      <Text style={styles.infoLabel}>Ubicación:</Text>
                      <Text style={styles.infoValue}>
                        {equipment.ubicacion || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <MaterialIcons name="devices" size={18} color="#4B5563" />
                      <Text style={styles.infoLabel}>Tipo:</Text>
                      <Text style={styles.infoValue}>
                        {equipment.equipamentos?.nombre || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#4B5563"
                      />
                      <Text style={styles.infoLabel}>Fecha:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(item.dia_programado).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Filter Modal */}
        <Modal
          visible={showFilters}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtrar por</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.filterSectionTitle}>Estado</Text>
                <View style={styles.filterOptionsContainer}>
                  {[
                    { label: 'Todos', value: '' },
                    {
                      label: 'No Iniciado',
                      value: MaintenanceStatusEnum.NO_INICIADO,
                    },
                    {
                      label: 'Finalizado',
                      value: MaintenanceStatusEnum.FINALIZADO,
                    },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.filterOption,
                        selectedStatus === option.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setSelectedStatus(option.value)}>
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedStatus === option.value &&
                            styles.filterOptionTextActive,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.filterSectionTitle}>Ubicación</Text>
                <View style={styles.filterOptionsContainer}>
                  {locations.map(loc => (
                    <TouchableOpacity
                      key={loc}
                      style={[
                        styles.filterOption,
                        selectedLocation === loc && styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setSelectedLocation(
                          selectedLocation === loc ? null : loc,
                        )
                      }>
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedLocation === loc &&
                            styles.filterOptionTextActive,
                        ]}>
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}>
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  activeTabWhite: {
    backgroundColor: '#fff',
    borderColor: '#E5E7EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#fff',
  },
  activeTabTextDark: {
    color: '#11181C',
  },
  listContainer: {
    marginTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  highlightedCard: {
    borderColor: '#C084FC',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardRotulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  cardCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#4B5563',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '500',
    flex: 1,
  },
  labelField: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 26,
    marginTop: 5,
    fontStyle: 'italic',
  },
  // Search & Filter
  searchBarContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#06B6D4',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06B6D4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 15,
    marginBottom: 10,
  },
  filterOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#06B6D4',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  filterOptionTextActive: {
    color: '#06B6D4',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#06B6D4',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20, // Check for safe area bottom padding
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBadgeContainer: {
    marginTop: 12,
    gap: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  dateBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0891B2',
  },
});
