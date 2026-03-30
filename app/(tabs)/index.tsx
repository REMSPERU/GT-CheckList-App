import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useProperties } from '@/hooks/use-property-query';
import { syncService } from '@/services/sync';
import type { PropertyResponse as Property } from '@/types/api';
import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { AppAlertModal } from '@/components/app-alert-modal';
import { AppActionCard } from '@/components/app-action-card';

const LAST_BUILDING_STORAGE_KEY = '@home:last-selected-building-id';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface HomeActionCard {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
}

function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useProperties();
  const hasSynced = useRef(false);

  const [selectedBuilding, setSelectedBuilding] = useState<Property | null>(
    null,
  );
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lastSelectedBuildingId, setLastSelectedBuildingId] = useState<
    string | null
  >(null);
  const [showMissingBuildingAlert, setShowMissingBuildingAlert] =
    useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 200);

    return () => clearTimeout(debounceTimeout);
  }, [searchInput]);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    const backgroundSync = async () => {
      try {
        await syncService.pushData();
        await syncService.pullData();
        refetch();
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    };

    void backgroundSync();
  }, [refetch]);

  useEffect(() => {
    const loadLastSelectedBuilding = async () => {
      try {
        const savedBuildingId = await AsyncStorage.getItem(
          LAST_BUILDING_STORAGE_KEY,
        );
        if (savedBuildingId) {
          setLastSelectedBuildingId(savedBuildingId);
        }
      } catch (error) {
        console.error('Failed to restore last selected building:', error);
      }
    };

    void loadLastSelectedBuilding();
  }, []);

  useEffect(() => {
    if (!lastSelectedBuildingId || !data?.items?.length || selectedBuilding) {
      return;
    }

    const restoredBuilding = data.items.find(
      building => String(building.id) === lastSelectedBuildingId,
    );

    if (restoredBuilding) {
      setSelectedBuilding(restoredBuilding);
    }
  }, [data?.items, lastSelectedBuildingId, selectedBuilding]);

  const handleBuildingSelect = useCallback((building: Property) => {
    setSelectedBuilding(building);

    const persistSelection = async () => {
      try {
        await AsyncStorage.setItem(
          LAST_BUILDING_STORAGE_KEY,
          String(building.id),
        );
      } catch (error) {
        console.error('Failed to save last selected building:', error);
      }
    };

    void persistSelection();
  }, []);

  const filteredBuildings = useMemo(() => {
    const items = data?.items ?? [];
    if (!debouncedSearch.trim()) return items;

    const query = normalizeText(debouncedSearch);
    return items.filter(building =>
      normalizeText(building.name).includes(query),
    );
  }, [data?.items, debouncedSearch]);

  const ensureBuildingIsSelected = useCallback(() => {
    if (selectedBuilding) return true;

    setShowMissingBuildingAlert(true);
    return false;
  }, [selectedBuilding]);

  const handleChecklistPress = useCallback(() => {
    if (!ensureBuildingIsSelected() || !selectedBuilding) return;

    router.push({
      pathname: '/maintenance/select-device',
      params: {
        type: 'checklist',
        buildingId: String(selectedBuilding.id),
        buildingName: selectedBuilding.name,
        buildingAddress: selectedBuilding.address ?? '',
        buildingImageUrl: selectedBuilding.image_url ?? '',
      },
    });
  }, [ensureBuildingIsSelected, router, selectedBuilding]);

  const handleScheduleMaintenancePress = useCallback(() => {
    if (!ensureBuildingIsSelected() || !selectedBuilding) return;

    router.push({
      pathname: '/maintenance/select-device',
      params: {
        buildingId: String(selectedBuilding.id),
        buildingName: selectedBuilding.name,
        buildingAddress: selectedBuilding.address ?? '',
        buildingImageUrl: selectedBuilding.image_url ?? '',
      },
    });
  }, [ensureBuildingIsSelected, router, selectedBuilding]);

  const handleExecuteMaintenancePress = useCallback(() => {
    if (!ensureBuildingIsSelected() || !selectedBuilding) return;

    router.push({
      pathname: '/maintenance/scheduled_maintenance/scheduled-maintenance',
      params: {
        autoOpenPropertyId: String(selectedBuilding.id),
        autoOpenPropertyName: selectedBuilding.name,
      },
    });
  }, [ensureBuildingIsSelected, router, selectedBuilding]);

  const handleReportsPress = useCallback(() => {
    if (!ensureBuildingIsSelected() || !selectedBuilding) return;

    router.push({
      pathname: '/equipment-record/[propertyId]',
      params: {
        propertyId: String(selectedBuilding.id),
        propertyName: selectedBuilding.name,
      },
    });
  }, [ensureBuildingIsSelected, router, selectedBuilding]);

  const handleLogoutConfirm = useCallback(async () => {
    setShowLogoutModal(false);
    await logout();
  }, [logout]);

  const actionCards = useMemo<HomeActionCard[]>(
    () => [
      {
        key: 'checklist',
        title: 'Checklist',
        description: 'Gestione sus tareas de inspeccion',
        icon: (
          <Octicons
            name="checklist"
            size={24}
            color="#06B6D4"
            style={styles.optionIcon}
          />
        ),
        onPress: handleChecklistPress,
      },
      {
        key: 'schedule-maintenance',
        title: 'Programar Mantenimiento',
        description: 'Registre problemas inmediatos del equipo',
        icon: (
          <MaterialIcons
            name="home-repair-service"
            size={24}
            color="#06B6D4"
            style={styles.optionIcon}
          />
        ),
        onPress: handleScheduleMaintenancePress,
      },
      {
        key: 'execute-maintenance',
        title: 'Ejecutar mantenimiento',
        description: 'Registre sus revisiones de rutina',
        icon: (
          <MaterialIcons
            name="home-repair-service"
            size={24}
            color="#06B6D4"
            style={styles.optionIcon}
          />
        ),
        onPress: handleExecuteMaintenancePress,
      },
      {
        key: 'reports',
        title: 'Generar informes',
        description: 'Genera informes de mantenimiento',
        icon: (
          <Feather
            name="file-text"
            size={24}
            color="#06B6D4"
            style={styles.optionIcon}
          />
        ),
        onPress: handleReportsPress,
      },
    ],
    [
      handleChecklistPress,
      handleExecuteMaintenancePress,
      handleReportsPress,
      handleScheduleMaintenancePress,
    ],
  );

  const renderBuildingRow = useCallback(
    ({ item }: { item: Property }) => {
      const isSelected = selectedBuilding?.id === item.id;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.buildingRow,
            isSelected && styles.buildingRowSelected,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            handleBuildingSelect(item);
            setShowBuildingModal(false);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Seleccionar ${item.name}`}>
          <View style={styles.buildingRowLeft}>
            <View style={styles.buildingRowAvatar}>
              <Text style={styles.buildingRowAvatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.buildingRowTextWrap}>
              <Text style={styles.buildingRowName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.address ? (
                <Text style={styles.buildingRowAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
            </View>
          </View>

          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isSelected ? '#06B6D4' : '#9CA3AF'}
          />
        </Pressable>
      );
    },
    [handleBuildingSelect, selectedBuilding?.id],
  );

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar los inmuebles</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcome}>Bienvenido,</Text>
          <Text style={styles.username}>
            {user?.user_metadata?.username ||
              user?.email?.split('@')[0] ||
              'Usuario'}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={() => setShowLogoutModal(true)}>
          <Ionicons name="log-out-outline" size={18} color="#0a7ea4" />
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContent}>
          <View style={styles.sectionTitleWrapper}>
            <Text style={styles.sectionTitle}>Inmueble de trabajo</Text>
          </View>

          <AppActionCard
            title={selectedBuilding?.name || 'Seleccionar inmueble'}
            description={
              selectedBuilding?.address ||
              'Elige un inmueble una vez y luego ejecuta cualquier accion.'
            }
            icon={
              <View style={styles.selectedBuildingIconWrap}>
                <Ionicons name="business-outline" size={20} color="#06B6D4" />
              </View>
            }
            onPress={() => setShowBuildingModal(true)}
            accessibilityLabel="Seleccionar inmueble"
          />

          <View style={styles.sectionTitleWrapperMain}>
            <Text style={styles.sectionTitle}>Que necesita hacer?</Text>
          </View>

          <View style={styles.optionsWrapper}>
            {actionCards.map(action => (
              <AppActionCard
                key={action.key}
                title={action.title}
                description={action.description}
                icon={action.icon}
                onPress={action.onPress}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            v{Constants.expoConfig?.version || '1.0.0'}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showBuildingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBuildingModal(false)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar inmueble</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowBuildingModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector">
                <Ionicons name="close" size={20} color="#4B5563" />
              </Pressable>
            </View>

            <View style={styles.searchWrapperModal}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar inmueble"
                placeholderTextColor="#9CA3AF"
                value={searchInput}
                onChangeText={setSearchInput}
              />
            </View>

            {isLoading && !data ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <FlatList
                data={filteredBuildings}
                keyExtractor={item => String(item.id)}
                renderItem={renderBuildingRow}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews={Platform.OS === 'android'}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No se encontraron inmuebles
                    </Text>
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Cerrar sesion</Text>
            <Text style={styles.confirmMessage}>
              Estas seguro de que deseas cerrar sesion?
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.confirmButtonSecondary,
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowLogoutModal(false)}
                accessibilityRole="button">
                <Text style={styles.confirmButtonSecondaryText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.confirmButtonDanger,
                  pressed && styles.pressed,
                ]}
                onPress={handleLogoutConfirm}
                accessibilityRole="button">
                <Text style={styles.confirmButtonDangerText}>
                  Cerrar sesion
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AppAlertModal
        visible={showMissingBuildingAlert}
        title="Seleccionar inmueble"
        message="Primero selecciona un inmueble para continuar."
        onClose={() => setShowMissingBuildingAlert(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'column',
  },
  welcome: {
    fontSize: 16,
    color: '#6B7280',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#0a7ea4',
    marginLeft: 6,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  mainContent: {
    gap: 10,
  },
  sectionTitleWrapper: {
    marginBottom: 2,
  },
  sectionTitleWrapperMain: {
    marginTop: 10,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  selectedBuildingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFEFF',
    marginRight: 12,
  },
  optionsWrapper: {
    gap: 10,
  },
  optionIcon: {
    marginRight: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    marginTop: 14,
    paddingBottom: 4,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,28,0.25)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '82%',
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  searchWrapperModal: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#11181C',
    fontSize: 14,
  },
  modalListContent: {
    paddingBottom: 24,
  },
  buildingRow: {
    minHeight: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buildingRowSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#ECFEFF',
  },
  buildingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  buildingRowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buildingRowAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buildingRowTextWrap: {
    flex: 1,
  },
  buildingRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  buildingRowAddress: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  confirmActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonSecondary: {
    backgroundColor: '#F1F5F9',
  },
  confirmButtonDanger: {
    backgroundColor: '#DC2626',
  },
  confirmButtonSecondaryText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButtonDangerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});

export default HomeScreen;
