import React, { useCallback, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
  Platform,
  type ListRenderItem,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceByProperty } from '@/hooks/use-maintenance';
import { MaintenanceStatusEnum } from '@/types/api';
import * as ImagePicker from 'expo-image-picker';
import { DatabaseService } from '@/services/database';
import { ensureImagePermission } from '@/lib/image-permissions';
import { supabase } from '@/lib/supabase';
import { syncService } from '@/services/sync';

interface EquipmentInfo {
  id: string;
  codigo: string;
  ubicacion: string;
  detalle_ubicacion?: string | null;
  equipment_detail?: {
    rotulo?: string;
  } | null;
  equipamentos?: {
    nombre?: string;
  };
}

interface MaintenanceByPropertyItem {
  id: string;
  dia_programado: string;
  estatus: string | null;
  sync_status?: 'synced' | 'pending' | 'syncing' | 'error' | string;
  sync_error_message?: string | null;
  tipo_mantenimiento: string;
  id_sesion?: string | null;
  equipos: EquipmentInfo;
}

interface ExecutionRouteParams {
  [key: string]: string | undefined;
  panelId: string;
  maintenanceId: string;
  equipmentType?: string;
  propertyId: string;
  propertyName?: string;
  maintenanceType: string;
  sessionTotal: string;
  sessionCompleted: string;
  sessionId: string;
}

interface SyncBadgeConfig {
  label: string;
  color: string;
  bgColor: string;
}

interface MaintenanceCardProps {
  item: MaintenanceByPropertyItem;
  statusColor: string;
  syncBadge: SyncBadgeConfig;
  syncErrorMessage?: string | null;
  onPressItem: (item: MaintenanceByPropertyItem) => void;
}

function getStatusColor(status: string) {
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
}

function getSyncBadgeConfig(syncStatus?: string): SyncBadgeConfig {
  switch (syncStatus) {
    case 'pending':
      return {
        label: 'PENDIENTE SYNC',
        color: '#B45309',
        bgColor: '#FEF3C7',
      };
    case 'syncing':
      return {
        label: 'SINCRONIZANDO',
        color: '#0369A1',
        bgColor: '#E0F2FE',
      };
    case 'error':
      return {
        label: 'ERROR SYNC',
        color: '#B91C1C',
        bgColor: '#FEE2E2',
      };
    default:
      return {
        label: 'SINCRONIZADO',
        color: '#047857',
        bgColor: '#D1FAE5',
      };
  }
}

const MaintenanceCard = React.memo(function MaintenanceCard({
  item,
  statusColor,
  syncBadge,
  syncErrorMessage,
  onPressItem,
}: MaintenanceCardProps) {
  const equipment = item.equipos || ({} as EquipmentInfo);

  const handlePress = useCallback(() => {
    onPressItem(item);
  }, [onPressItem, item]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityRole="button">
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderInfo}>
          {equipment.equipment_detail?.rotulo && (
            <Text style={styles.cardRotulo}>
              {equipment.equipment_detail.rotulo}
            </Text>
          )}
          <Text style={styles.cardCode}>{equipment.codigo || 'S/N'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>

      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: statusColor + '20',
          },
        ]}>
        <Text
          style={[
            styles.statusText,
            {
              color: statusColor,
            },
          ]}>
          {item.estatus || 'SIN ESTADO'}
        </Text>
      </View>

      {item.estatus === MaintenanceStatusEnum.FINALIZADO && (
        <>
          <View
            style={[
              styles.syncBadge,
              {
                backgroundColor: syncBadge.bgColor,
              },
            ]}>
            <Text
              style={[
                styles.syncBadgeText,
                {
                  color: syncBadge.color,
                },
              ]}>
              {syncBadge.label}
            </Text>
          </View>
          {item.sync_status === 'error' && !!syncErrorMessage && (
            <View style={styles.syncErrorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
              <Text style={styles.syncErrorText} numberOfLines={3}>
                {syncErrorMessage}
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={18} color="#4B5563" />
        <Text style={styles.infoLabel}>Ubicación:</Text>
        <Text style={styles.infoValue}>{equipment.ubicacion || 'N/A'}</Text>
      </View>

      {equipment.detalle_ubicacion ? (
        <View style={styles.infoRow}>
          <Ionicons name="navigate-outline" size={18} color="#4B5563" />
          <Text style={styles.infoLabel}>Detalle:</Text>
          <Text style={styles.infoValue}>{equipment.detalle_ubicacion}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

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
  const [pendingNavigation, setPendingNavigation] =
    useState<ExecutionRouteParams | null>(null);
  const [checkingPhotos, setCheckingPhotos] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Fetch Data
  const {
    data: maintenanceData = [] as MaintenanceByPropertyItem[],
    isLoading,
    refetch,
    isRefetching,
  } = useMaintenanceByProperty(propertyId);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const refreshOnFocus = async () => {
        try {
          void syncService.triggerSync('equipment-maintenance-list-focus', { pushOnly: true }).catch(error => {
            console.error('Focus push failed in equipment list:', error);
          });
        } catch (error) {
          console.error('Focus sync failed in equipment list:', error);
        } finally {
          if (active) {
            await refetch();
          }
        }
      };

      void refreshOnFocus();

      return () => {
        active = false;
      };
    }, [refetch]),
  );

  // Derived Filters Options
  const { locations } = useMemo(() => {
    const locs = new Set<string>();

    maintenanceData.forEach(item => {
      // Apply session filter for deriving filter options
      if (sessionId && item.id_sesion !== sessionId) return;

      if (item.equipos?.ubicacion) locs.add(item.equipos.ubicacion);
    });

    return {
      locations: Array.from(locs),
    };
  }, [maintenanceData, sessionId]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return maintenanceData.filter(item => {
      // 0. Filter by Session ID (if provided)
      if (sessionId && item.id_sesion !== sessionId) return false;

      // 1. Status Filter
      if (selectedStatus && item.estatus !== selectedStatus) return false;

      // 2. Search Filter (Only Code)
      const searchLower = searchQuery.toLowerCase();
      const code = item.equipos?.codigo?.toLowerCase() || '';
      if (!code.includes(searchLower)) return false;

      // 3. Dynamic Filters
      if (selectedLocation && item.equipos?.ubicacion !== selectedLocation)
        return false;

      return true;
    });
  }, [
    maintenanceData,
    searchQuery,
    selectedLocation,
    selectedStatus,
    sessionId,
  ]);

  // Calculate session totals for determining if this is the last equipment
  const sessionTotals = useMemo(() => {
    if (!sessionId) return { total: 0, completed: 0 };

    const sessionItems = maintenanceData.filter(
      item => item.id_sesion === sessionId,
    );
    const completed = sessionItems.filter(
      item => item.estatus === MaintenanceStatusEnum.FINALIZADO,
    ).length;

    return { total: sessionItems.length, completed };
  }, [maintenanceData, sessionId]);

  // --- Session Photo Logic for Luces de Emergencia ---
  const handleEmergencyLightNavigation = useCallback(
    async (navParams: ExecutionRouteParams) => {
      if (!sessionId) {
        router.push({ pathname: '/maintenance/execution', params: navParams });
        return;
      }

      setCheckingPhotos(true);
      try {
        const hasPhotos = await DatabaseService.sessionHasPhotos(sessionId);
        if (hasPhotos) {
          // Already has photos, navigate directly
          router.push({
            pathname: '/maintenance/execution',
            params: navParams,
          });
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
    },
    [router, sessionId],
  );

  const handlePressMaintenance = useCallback(
    (item: MaintenanceByPropertyItem) => {
      const equipment = item.equipos || ({} as EquipmentInfo);

      if (item.estatus === MaintenanceStatusEnum.FINALIZADO) {
        router.push({
          pathname:
            '/maintenance/scheduled_maintenance/maintenance-response-detail',
          params: {
            maintenanceId: item.id,
          },
        });
        return;
      }

      const navParams: ExecutionRouteParams = {
        panelId: equipment.id,
        maintenanceId: item.id,
        equipmentType: equipment.equipamentos?.nombre,
        propertyId: propertyId || '',
        propertyName,
        maintenanceType: item.tipo_mantenimiento,
        sessionTotal: sessionTotals.total.toString(),
        sessionCompleted: sessionTotals.completed.toString(),
        sessionId: sessionId || '',
      };

      if (
        equipment.equipamentos?.nombre === 'Luces de Emergencia' &&
        sessionId
      ) {
        handleEmergencyLightNavigation(navParams);
      } else {
        router.push({
          pathname: '/maintenance/execution',
          params: navParams,
        });
      }
    },
    [
      handleEmergencyLightNavigation,
      propertyId,
      propertyName,
      router,
      sessionId,
      sessionTotals.completed,
      sessionTotals.total,
    ],
  );

  const handleManualSync = useCallback(async () => {
    setIsManualSyncing(true);

    try {
      await syncService.triggerSync('equipment-maintenance-list-manual-sync', { force: true });
      await refetch();
    } catch (error) {
      console.error('Manual sync failed in equipment list:', error);
      Alert.alert(
        'Sincronizacion incompleta',
        'No se pudo completar la sincronizacion. Revisa las tarjetas con ERROR SYNC para ver el motivo y vuelve a intentar.',
      );
    } finally {
      setIsManualSyncing(false);
    }
  }, [refetch]);

  const handleTakeSessionPhoto = async () => {
    const hasCameraPermission = await ensureImagePermission('camera', {
      deniedMessage: 'Debe habilitar acceso a la camara para tomar fotos.',
    });
    if (!hasCameraPermission) return;

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
        .triggerSync('equipment-maintenance-list-post-photos', { pushOnly: true })
        .catch(err => console.error('Background sync failed:', err));

      // Close modal and navigate
      setShowPhotoModal(false);
      setSessionPhotos([]);
      if (pendingNavigation !== null) {
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

  const renderMaintenanceItem = useCallback<
    ListRenderItem<MaintenanceByPropertyItem>
  >(
    ({ item }) => {
      const statusColor = getStatusColor(item.estatus || '');
      const syncBadge = getSyncBadgeConfig(item.sync_status);

      return (
        <MaintenanceCard
          item={item}
          statusColor={statusColor}
          syncBadge={syncBadge}
          syncErrorMessage={item.sync_error_message}
          onPressItem={handlePressMaintenance}
        />
      );
    },
    [handlePressMaintenance],
  );

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
          <Pressable
            style={[
              styles.filterButton,
              selectedLocation && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(true)}
            accessibilityRole="button">
            <Feather
              name="filter"
              size={20}
              color={selectedLocation ? '#fff' : '#4B5563'}
            />
          </Pressable>
        </View>

        <Pressable
          style={[styles.manualSyncButton, isManualSyncing && styles.pressed]}
          onPress={handleManualSync}
          disabled={isManualSyncing}
          accessibilityRole="button"
          accessibilityLabel="Sincronizar ahora">
          {isManualSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="sync-outline" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.manualSyncButtonText}>
            {isManualSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </Text>
        </Pressable>

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
              <Pressable
                onPress={() => setSelectedLocation(null)}
                style={styles.chip}
                accessibilityRole="button">
                <Text style={styles.chipText}>{selectedLocation}</Text>
                <Feather name="x" size={14} color="#FFF" />
              </Pressable>
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
          <FlatList
            style={styles.listContainer}
            data={filteredData}
            keyExtractor={item => item.id}
            renderItem={renderMaintenanceItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching || isManualSyncing}
                onRefresh={handleManualSync}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  No se encontraron mantenimientos.
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContentContainer}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
          />
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
                <Pressable onPress={() => setShowFilters(false)}>
                  <Feather name="x" size={24} color="#000" />
                </Pressable>
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
                    <Pressable
                      key={option.label}
                      style={[
                        styles.filterOption,
                        selectedStatus === option.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setSelectedStatus(option.value)}
                      accessibilityRole="button">
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedStatus === option.value &&
                            styles.filterOptionTextActive,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.filterSectionTitle}>Ubicación</Text>
                <View style={styles.filterOptionsContainer}>
                  {locations.map(loc => (
                    <Pressable
                      key={loc}
                      style={[
                        styles.filterOption,
                        selectedLocation === loc && styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setSelectedLocation(
                          selectedLocation === loc ? null : loc,
                        )
                      }
                      accessibilityRole="button">
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedLocation === loc &&
                            styles.filterOptionTextActive,
                        ]}>
                        {loc}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Pressable
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
                accessibilityRole="button">
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </Pressable>
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
                <Pressable
                  onPress={() => {
                    setShowPhotoModal(false);
                    setPendingNavigation(null);
                    setSessionPhotos([]);
                  }}>
                  <Feather name="x" size={24} color="#000" />
                </Pressable>
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
                        <Pressable
                          style={styles.sessionPhotoRemoveBtn}
                          onPress={() => handleRemoveSessionPhoto(index)}
                          accessibilityRole="button">
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#EF4444"
                          />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.sessionPhotoEmpty}
                        onPress={
                          sessionPhotos.length === index
                            ? handleTakeSessionPhoto
                            : undefined
                        }
                        accessibilityRole="button">
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
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              {/* Counter */}
              <Text style={styles.sessionPhotoCounter}>
                {sessionPhotos.length}/2 fotos
              </Text>

              {/* Confirm Button */}
              <Pressable
                style={[
                  styles.applyButton,
                  sessionPhotos.length !== 2 && { backgroundColor: '#D1D5DB' },
                ]}
                onPress={handleConfirmSessionPhotos}
                disabled={sessionPhotos.length !== 2}
                accessibilityRole="button">
                <Text style={styles.applyButtonText}>
                  Continuar con Mantenimiento
                </Text>
              </Pressable>
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
  listContainer: {
    marginTop: 20,
  },
  listContentContainer: {
    paddingBottom: 40,
  },
  emptyStateContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateText: {
    color: '#6B7280',
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
  syncBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: -4,
    marginBottom: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  syncErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 16,
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
  manualSyncButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0E7490',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manualSyncButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  pressed: {
    opacity: 0.84,
  },
});
