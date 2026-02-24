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
  Image,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceByProperty } from '@/hooks/use-maintenance';
import { MaintenanceStatusEnum } from '@/types/api';
import * as ImagePicker from 'expo-image-picker';
import { DatabaseService } from '@/services/database';
import { supabase } from '@/lib/supabase';
import { syncService } from '@/services/sync';

export default function EquipmentMaintenanceListScreen() {
  const router = useRouter();
  const { propertyId, sessionId, sessionName, propertyName } =
    useLocalSearchParams<{
      propertyId: string;
      sessionId?: string;
      sessionName?: string;
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
    sessionId ? '' : MaintenanceStatusEnum.NO_INICIADO,
  );

  // Session Photo Modal States
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);
  const [pendingNavigation, setPendingNavigation] = useState<any>(null);
  const [checkingPhotos, setCheckingPhotos] = useState(false);

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
      // Apply session filter for deriving filter options
      if (sessionId && item.id_sesion !== sessionId) return;

      if (item.equipos?.ubicacion) locs.add(item.equipos.ubicacion);
      if (item.equipos?.equipamentos?.nombre)
        typs.add(item.equipos.equipamentos.nombre);
    });

    return {
      locations: Array.from(locs),
    };
  }, [maintenanceData, sessionId]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return maintenanceData.filter((item: any) => {
      // 0. Filter by Session ID (if provided)
      if (sessionId && item.id_sesion !== sessionId) return false;

      // 1. Tab Filter (Tipo Mantenimiento)
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
    sessionId,
  ]);

  // Calculate session totals for determining if this is the last equipment
  const sessionTotals = useMemo(() => {
    if (!sessionId) return { total: 0, completed: 0 };

    const sessionItems = maintenanceData.filter(
      (item: any) => item.id_sesion === sessionId,
    );
    const completed = sessionItems.filter(
      (item: any) => item.estatus === MaintenanceStatusEnum.FINALIZADO,
    ).length;

    return { total: sessionItems.length, completed };
  }, [maintenanceData, sessionId]);

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

  // --- Session Photo Logic for Luces de Emergencia ---
  const handleEmergencyLightNavigation = async (navParams: any) => {
    if (!sessionId) {
      router.push({ pathname: '/maintenance/execution', params: navParams });
      return;
    }

    setCheckingPhotos(true);
    try {
      const hasPhotos = await DatabaseService.sessionHasPhotos(sessionId);
      if (hasPhotos) {
        // Already has photos, navigate directly
        router.push({ pathname: '/maintenance/execution', params: navParams });
      } else {
        // Need to capture session photos first
        setPendingNavigation(navParams);
        setSessionPhotos([]);
        setShowPhotoModal(true);
      }
    } catch (error) {
      console.error('Error checking session photos:', error);
      // On error, allow navigation anyway
      router.push({ pathname: '/maintenance/execution', params: navParams });
    } finally {
      setCheckingPhotos(false);
    }
  };

  const handleTakeSessionPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSessionPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
  };

  const handleRemoveSessionPhoto = (index: number) => {
    setSessionPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmSessionPhotos = async () => {
    if (sessionPhotos.length !== 2) {
      Alert.alert(
        'Fotos requeridas',
        'Debe tomar exactamente 2 fotos para iniciar la sesión de mantenimiento.',
      );
      return;
    }

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || '';

      // Save photos to offline queue
      await DatabaseService.saveOfflineSessionPhotos(
        sessionId!,
        sessionPhotos,
        userId,
      );

      // Trigger background sync
      syncService
        .pushData()
        .catch(err => console.error('Background sync failed:', err));

      // Close modal and navigate
      setShowPhotoModal(false);
      setSessionPhotos([]);
      if (pendingNavigation) {
        router.push({
          pathname: '/maintenance/execution',
          params: pendingNavigation,
        });
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Error saving session photos:', error);
      Alert.alert(
        'Error',
        'No se pudieron guardar las fotos. Intente nuevamente.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MaintenanceHeader
          title="Mantenimiento programado"
          iconName="home-repair-service"
        />

        {/* Session / Date Badge */}
        {(sessionName || propertyName) && (
          <View style={styles.infoBadgeContainer}>
            {sessionName && (
              <View style={styles.dateBadge}>
                <Ionicons name="construct-outline" size={16} color="#06B6D4" />
                <Text style={styles.dateBadgeText} numberOfLines={2}>
                  {sessionName}
                </Text>
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
                        const navParams = {
                          panelId: equipment.id,
                          maintenanceId: item.id,
                          equipmentType: equipment.equipamentos?.nombre,
                          propertyId: propertyId,
                          propertyName: propertyName,
                          maintenanceType: item.tipo_mantenimiento,
                          sessionTotal: sessionTotals.total.toString(),
                          sessionCompleted: sessionTotals.completed.toString(),
                          sessionId: sessionId || '',
                        };

                        // Intercept for Luces de Emergencia: check session photos
                        if (
                          equipment.equipamentos?.nombre ===
                            'Luces de Emergencia' &&
                          sessionId
                        ) {
                          handleEmergencyLightNavigation(navParams);
                        } else {
                          router.push({
                            pathname: '/maintenance/execution',
                            params: navParams,
                          });
                        }
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

        {/* Session Photo Modal */}
        <Modal
          visible={showPhotoModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowPhotoModal(false);
            setPendingNavigation(null);
            setSessionPhotos([]);
          }}>
          <View style={styles.modalOverlay}>
            <View style={styles.sessionPhotoModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Fotos de Sesión</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowPhotoModal(false);
                    setPendingNavigation(null);
                    setSessionPhotos([]);
                  }}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sessionPhotoSubtitle}>
                Tome 2 fotos para iniciar la sesión de mantenimiento de luces de
                emergencia. Estas fotos se usarán en el informe.
              </Text>

              {/* Photo Grid */}
              <View style={styles.sessionPhotoGrid}>
                {[0, 1].map(index => (
                  <View key={index} style={styles.sessionPhotoSlot}>
                    {sessionPhotos[index] ? (
                      <View style={styles.sessionPhotoFilled}>
                        <Image
                          source={{ uri: sessionPhotos[index] }}
                          style={styles.sessionPhotoImage}
                        />
                        <TouchableOpacity
                          style={styles.sessionPhotoRemoveBtn}
                          onPress={() => handleRemoveSessionPhoto(index)}>
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.sessionPhotoEmpty}
                        onPress={
                          sessionPhotos.length === index
                            ? handleTakeSessionPhoto
                            : undefined
                        }>
                        <Ionicons
                          name="camera-outline"
                          size={32}
                          color={
                            sessionPhotos.length === index
                              ? '#06B6D4'
                              : '#D1D5DB'
                          }
                        />
                        <Text
                          style={[
                            styles.sessionPhotoEmptyText,
                            sessionPhotos.length === index && {
                              color: '#06B6D4',
                            },
                          ]}>
                          Foto {index + 1}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* Counter */}
              <Text style={styles.sessionPhotoCounter}>
                {sessionPhotos.length}/2 fotos
              </Text>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  sessionPhotos.length !== 2 && { backgroundColor: '#D1D5DB' },
                ]}
                onPress={handleConfirmSessionPhotos}
                disabled={sessionPhotos.length !== 2}>
                <Text style={styles.applyButtonText}>
                  Continuar con Mantenimiento
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Loading overlay for checking photos */}
        {checkingPhotos && (
          <View style={styles.checkingOverlay}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        )}
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
  // Session Photo Modal Styles
  sessionPhotoModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sessionPhotoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  sessionPhotoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  sessionPhotoSlot: {
    flex: 1,
    aspectRatio: 1,
  },
  sessionPhotoFilled: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  sessionPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  sessionPhotoRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  sessionPhotoEmpty: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
  },
  sessionPhotoEmptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  sessionPhotoCounter: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  checkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
