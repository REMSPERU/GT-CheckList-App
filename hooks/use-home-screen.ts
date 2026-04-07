import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useProperties } from '@/hooks/use-property-query';
import { syncService } from '@/services/sync';
import { DatabaseService } from '@/services/database';
import type { PropertyResponse as Property } from '@/types/api';

const LAST_BUILDING_STORAGE_KEY = '@home:last-selected-building-id';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function useHomeScreen() {
  const { user, logout } = useAuth();
  const { canAudit, isAuditor } = useUserRole();
  const router = useRouter();
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

  const hasProperties = (data?.items?.length ?? 0) > 0;
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

  const handleAuditPress = useCallback(async () => {
    if (!canAudit) return;

    if (!selectedBuilding) {
      router.push('/auditoria');
      return;
    }

    if (isAuditor && user?.id) {
      const assignedProperties =
        await DatabaseService.getAssignedPropertiesForAuditor(user.id);
      const selectedBuildingId = String(selectedBuilding.id);
      const isAssigned = (assignedProperties || []).some(property => {
        if (!property || typeof property !== 'object' || !('id' in property)) {
          return false;
        }

        return String((property as { id: string }).id) === selectedBuildingId;
      });

      if (!isAssigned) {
        router.push('/auditoria');
        return;
      }
    }

    router.push({
      pathname: '/auditoria/session',
      params: {
        buildingId: String(selectedBuilding.id),
        buildingName: selectedBuilding.name,
        buildingAddress: selectedBuilding.address ?? '',
        buildingImageUrl: selectedBuilding.image_url ?? '',
      },
    });
  }, [canAudit, isAuditor, router, selectedBuilding, user?.id]);

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
    handleLogoutConfirm,
  };
}
