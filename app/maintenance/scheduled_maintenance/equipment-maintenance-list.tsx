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
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();

  // State
  const [activeTab, setActiveTab] = useState<'Preventivo' | 'Correctivo'>(
    'Preventivo',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Fetch Data
  const { data: maintenanceData = [], isLoading } =
    useMaintenanceByProperty(propertyId);

  // Derived Filters Options
  const { locations, types } = useMemo(() => {
    const locs = new Set<string>();
    const typs = new Set<string>();

    maintenanceData.forEach((item: any) => {
      if (item.equipos?.ubicacion) locs.add(item.equipos.ubicacion);
      if (item.equipos?.equipamentos?.nombre)
        typs.add(item.equipos.equipamentos.nombre);
    });

    return {
      locations: Array.from(locs),
      types: Array.from(typs),
    };
  }, [maintenanceData]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return maintenanceData.filter((item: any) => {
      // 1. Tab Filter (Tipo Mantenimiento)
      // Database stores 'Preventivo' or 'Correctivo' (case sensitive usually)
      if (item.tipo_mantenimiento !== activeTab) return false;

      // 2. Search Filter (Only Code)
      const searchLower = searchQuery.toLowerCase();
      const code = item.equipos?.codigo?.toLowerCase() || '';

      if (!code.includes(searchLower)) return false;

      // 3. Dynamic Filters
      if (selectedLocation && item.equipos?.ubicacion !== selectedLocation)
        return false;
      if (selectedType && item.equipos?.equipamentos?.nombre !== selectedType)
        return false;

      return true;
    });
  }, [maintenanceData, activeTab, searchQuery, selectedLocation, selectedType]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MaintenanceHeader
          title="Mantenimiento programado"
          iconName="home-repair-service"
        />

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
              (selectedLocation || selectedType) && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(true)}>
            <Feather
              name="filter"
              size={20}
              color={selectedLocation || selectedType ? '#fff' : '#4B5563'}
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
        {(selectedLocation || selectedType) && (
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
            {selectedType && (
              <TouchableOpacity
                onPress={() => setSelectedType(null)}
                style={styles.chip}>
                <Text style={styles.chipText}>{selectedType}</Text>
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
            showsVerticalScrollIndicator={false}>
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
                    onPress={() =>
                      router.push({
                        pathname:
                          '/maintenance/scheduled_maintenance/equipment-details',
                        params: {
                          panelId: equipment.id,
                          maintenanceId: item.id,
                        },
                      })
                    }>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardCode}>
                        {equipment.codigo || 'S/N'}
                      </Text>
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

                <Text style={styles.filterSectionTitle}>Tipo de Equipo</Text>
                <View style={styles.filterOptionsContainer}>
                  {types.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        selectedType === type && styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setSelectedType(selectedType === type ? null : type)
                      }>
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedType === type &&
                            styles.filterOptionTextActive,
                        ]}>
                        {type}
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
  cardCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
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
});
