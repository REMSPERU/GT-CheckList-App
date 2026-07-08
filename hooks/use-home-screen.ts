import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/use-user-role';
import { useProperties } from '@/hooks/use-property-query';
import { syncService } from '@/services/sync';
import type { PropertyResponse as Property } from '@/types/api';

const logHomeFlow = (...args: unknown[]) => {
  if (__DEV__) {
    console.log('[useHomeScreen]', ...args);
  }
};

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

  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(0);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [tick, setTick] = useState(0);

  // Restore search input debouncing
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 200);

    return () => clearTimeout(debounceTimeout);
  }, [searchInput]);

  // Tick interval to automatically refresh relative times
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLastSyncTime = useCallback(async () => {
    const ts = await syncService.getLastSyncTimestamp();
    setLastSyncTimestamp(ts);
  }, []);

  useEffect(() => {
    fetchLastSyncTime();
  }, [fetchLastSyncTime]);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    const backgroundSync = async () => {
      try {
        logHomeFlow('initial sync start');
        await syncService.triggerSync('home-screen-mount');
        logHomeFlow('initial sync done, triggering properties refetch');
        refetch();
        await fetchLastSyncTime();
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    };

    void backgroundSync();
  }, [refetch, fetchLastSyncTime]);

  const handleManualSync = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      await syncService.triggerSync('home-screen-manual-refresh', { force: true });
      await refetch();
      await fetchLastSyncTime();
    } catch (error) {
      console.error('Manual sync failed on home:', error);
    } finally {
      setIsManualSyncing(false);
    }
  }, [refetch, fetchLastSyncTime]);

  const lastSyncTimeText = useMemo(() => {
    if (!lastSyncTimestamp) return 'Nunca';
    const diffMs = Date.now() - lastSyncTimestamp;
    if (diffMs < 0) return 'Hace unos momentos';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
      return 'Hace unos momentos';
    } else if (diffMin < 60) {
      return `Hace ${diffMin} min`;
    } else if (diffHr < 24) {
      return `Hace ${diffHr} ${diffHr === 1 ? 'hora' : 'horas'}`;
    } else {
      return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    }
  }, [lastSyncTimestamp, tick]);

  useEffect(() => {
    if (!user?.id) return;

    const loadCachedHomeData = async () => {
      try {
        const lastBuildingKey = `@home:last-selected-building-id:${user.id}`;
        const cachedBuildingsKey = `@home:cached-buildings:${user.id}`;

        const [savedBuildingId, savedBuildings] = await Promise.all([
          AsyncStorage.getItem(lastBuildingKey),
          AsyncStorage.getItem(cachedBuildingsKey),
        ]);

        if (savedBuildingId) {
          setLastSelectedBuildingId(savedBuildingId);
          logHomeFlow('restored last selected building', {
            buildingId: savedBuildingId,
          });
        } else {
          setLastSelectedBuildingId(null);
          setSelectedBuilding(null);
        }

        if (savedBuildings) {
          const parsed = JSON.parse(savedBuildings) as Property[];
          if (Array.isArray(parsed)) {
            setCachedBuildings(parsed);
            logHomeFlow('restored cached buildings from AsyncStorage', {
              cachedCount: parsed.length,
            });
          }
        } else {
          setCachedBuildings([]);
        }
      } catch (error) {
        console.error('Failed to restore cached home data:', error);
      }
    };

    void loadCachedHomeData();
  }, [user?.id]);

  // Ref to track the last hash we persisted, avoiding redundant writes
  const lastPersistedHashRef = useRef('');

  useEffect(() => {
    if (!user?.id || !data) return;
    const liveBuildings = data.items;

    // Simple hash: length + first/last IDs. Skip write if unchanged.
    const hash = `${liveBuildings.length}:${liveBuildings[0]?.id || ''}:${liveBuildings[liveBuildings.length - 1]?.id || ''}`;
    if (hash === lastPersistedHashRef.current) return;
    lastPersistedHashRef.current = hash;

    logHomeFlow('persisting live buildings to cache', {
      liveCount: liveBuildings.length,
    });

    setCachedBuildings(liveBuildings);

    // Debounced write (500ms) — coalesces rapid updates
    const timeoutId = setTimeout(async () => {
      try {
        const cachedBuildingsKey = `@home:cached-buildings:${user.id}`;
        await AsyncStorage.setItem(
          cachedBuildingsKey,
          JSON.stringify(liveBuildings),
        );
      } catch (error) {
        console.error('Failed to cache buildings:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [data, user?.id]);

  const sourceBuildings = useMemo(() => {
    // If the query has finished loading, use its list (even if empty)
    if (data?.items) {
      return data.items;
    }
    return cachedBuildings;
  }, [cachedBuildings, data?.items]);

  useEffect(() => {
    const liveCount = data?.items?.length ?? 0;
    logHomeFlow('source buildings updated', {
      liveCount,
      cachedCount: cachedBuildings.length,
      sourceCount: sourceBuildings.length,
      source: data?.items ? 'react-query/live' : 'async-storage/cached',
    });
  }, [cachedBuildings.length, data, sourceBuildings.length]);

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
    if (!user?.id) return;

    const persistSelection = async () => {
      try {
        const lastBuildingKey = `@home:last-selected-building-id:${user.id}`;
        await AsyncStorage.setItem(
          lastBuildingKey,
          String(building.id),
        );
      } catch (error) {
        console.error('Failed to save last selected building:', error);
      }
    };

    void persistSelection();
  }, [user?.id]);

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
      pathname: '/maintenance/scheduled_maintenance/maintenance-session',
      params: {
        propertyId: String(selectedBuilding.id),
        propertyName: selectedBuilding.name,
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

  const handleInventoryPress = useCallback(() => {
    if (!ensureBuildingIsSelected() || !selectedBuilding) return;

    router.push({
      pathname: '/inventory/systems' as never,
      params: {
        propertyId: String(selectedBuilding.id),
        propertyName: selectedBuilding.name,
        propertyAddress: selectedBuilding.address ?? '',
        propertyImageUrl: selectedBuilding.image_url ?? '',
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
    handleInventoryPress,
    handleAccountPress,
    handleLogoutConfirm,
    lastSyncTimeText,
    isManualSyncing,
    handleManualSync,
  };
}
