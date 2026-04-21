import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useProperties } from '@/hooks/use-property-query';
import { syncService } from '@/services/sync';
import type { PropertyResponse as Property } from '@/types/api';

const LAST_BUILDING_STORAGE_KEY = '@home:last-selected-building-id';
const CACHED_BUILDINGS_STORAGE_KEY = '@home:cached-buildings';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function useHomeScreen() {
  const { user, logout } = useAuth();
  const { canAudit } = useUserRole();
  const router = useRouter();
  const resetPasswordHref = '/auth/reset-password' as Href;
  const { data, isLoading, isError, refetch } = useProperties();
  const hasSynced = useRef(false);

  const [selectedBuilding, setSelectedBuilding] = useState<Property | null>(
    null,
  );
  const [isBuildingModalVisible, setIsBuildingModalVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lastSelectedBuildingId, setLastSelectedBuildingId] = useState<
    string | null
  >(null);
  const [cachedBuildings, setCachedBuildings] = useState<Property[]>([]);
  const [isMissingBuildingAlertVisible, setIsMissingBuildingAlertVisible] =
    useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

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
    const loadCachedHomeData = async () => {
      try {
        const [savedBuildingId, savedBuildings] = await Promise.all([
          AsyncStorage.getItem(LAST_BUILDING_STORAGE_KEY),
          AsyncStorage.getItem(CACHED_BUILDINGS_STORAGE_KEY),
        ]);

        if (savedBuildingId) {
          setLastSelectedBuildingId(savedBuildingId);
        }

        if (savedBuildings) {
          const parsed = JSON.parse(savedBuildings) as Property[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCachedBuildings(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to restore cached home data:', error);
      }
    };

    void loadCachedHomeData();
  }, []);

  useEffect(() => {
    const liveBuildings = data?.items ?? [];
    if (liveBuildings.length === 0) return;

    const persistBuildings = async () => {
      try {
        await AsyncStorage.setItem(
          CACHED_BUILDINGS_STORAGE_KEY,
          JSON.stringify(liveBuildings),
        );
      } catch (error) {
        console.error('Failed to cache buildings:', error);
      }
    };

    setCachedBuildings(liveBuildings);
    void persistBuildings();
  }, [data?.items]);

  const sourceBuildings = useMemo(() => {
    const liveBuildings = data?.items ?? [];
    return liveBuildings.length > 0 ? liveBuildings : cachedBuildings;
  }, [cachedBuildings, data?.items]);

  useEffect(() => {
    if (
      !lastSelectedBuildingId ||
      sourceBuildings.length === 0 ||
      selectedBuilding
    ) {
      return;
    }

    const restoredBuilding = sourceBuildings.find(
      building => String(building.id) === lastSelectedBuildingId,
    );

    if (restoredBuilding) {
      setSelectedBuilding(restoredBuilding);
    }
  }, [sourceBuildings, lastSelectedBuildingId, selectedBuilding]);

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
    const items = sourceBuildings;
    if (!debouncedSearch.trim()) return items;

    const query = normalizeText(debouncedSearch);
    return items.filter(building =>
      normalizeText(building.name).includes(query),
    );
  }, [debouncedSearch, sourceBuildings]);

  const hasProperties = sourceBuildings.length > 0;
  const isInitialLoading = isLoading && !hasProperties;
  const hasInitialError = isError && !hasProperties;

  const ensureBuildingIsSelected = useCallback(() => {
    if (selectedBuilding) return true;

    setIsMissingBuildingAlertVisible(true);
    return false;
  }, [selectedBuilding]);

  const openBuildingModal = useCallback(() => {
    setIsBuildingModalVisible(true);
  }, []);

  const closeBuildingModal = useCallback(() => {
    setIsBuildingModalVisible(false);
  }, []);

  const openLogoutModal = useCallback(() => {
    setIsLogoutModalVisible(true);
  }, []);

  const closeLogoutModal = useCallback(() => {
    setIsLogoutModalVisible(false);
  }, []);

  const closeMissingBuildingAlert = useCallback(() => {
    setIsMissingBuildingAlertVisible(false);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    setIsLogoutModalVisible(false);
    await logout();
  }, [logout]);

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

  const handleAuditPress = useCallback(() => {
    if (!canAudit) return;

    if (!ensureBuildingIsSelected() || !selectedBuilding) return;

    router.push({
      pathname: '/auditoria/history',
      params: {
        buildingId: String(selectedBuilding.id),
        buildingName: selectedBuilding.name,
        buildingAddress: selectedBuilding.address ?? '',
        buildingImageUrl: selectedBuilding.image_url ?? '',
      },
    });
  }, [canAudit, ensureBuildingIsSelected, router, selectedBuilding]);

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

  const handleAccountPress = useCallback(() => {
    router.push(resetPasswordHref);
  }, [resetPasswordHref, router]);

  const userDisplayName =
    user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuario';

  return {
    userDisplayName,
    selectedBuilding,
    filteredBuildings,
    isLoading: isInitialLoading,
    isError: hasInitialError,
    searchInput,
    setSearchInput,
    isBuildingModalVisible,
    isMissingBuildingAlertVisible,
    isLogoutModalVisible,
    openBuildingModal,
    closeBuildingModal,
    openLogoutModal,
    closeLogoutModal,
    closeMissingBuildingAlert,
    handleBuildingSelect,
    handleChecklistPress,
    handleScheduleMaintenancePress,
    handleExecuteMaintenancePress,
    handleAuditPress,
    handleReportsPress,
    handleAccountPress,
    handleLogoutConfirm,
  };
}
