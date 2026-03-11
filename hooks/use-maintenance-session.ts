import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaintenanceSession, PhotoItem } from '../types/maintenance-session';

const STORAGE_KEY_PREFIX = 'maintenance_session_';
const PERSIST_DEBOUNCE_MS = 300;

interface SaveOptions {
  immediate?: boolean;
}

export const useMaintenanceSession = (
  panelId: string,
  maintenanceId?: string,
  initialContext?: {
    building?: any;
    maintenanceType?: string;
    propertyId?: string;
    propertyName?: string;
    // Session context for last equipment detection
    sessionTotal?: number;
    sessionCompleted?: number;
    sessionDate?: string;
  },
) => {
  const [session, setSession] = useState<MaintenanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const latestSessionRef = useRef<MaintenanceSession | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionId = `${STORAGE_KEY_PREFIX}${panelId}_${maintenanceId || 'adhoc'}`;
  const initialContextRef = useRef(initialContext);

  useEffect(() => {
    initialContextRef.current = initialContext;
  }, [sessionId, initialContext]);

  const persistNow = useCallback(
    async (nextSession: MaintenanceSession) => {
      try {
        await AsyncStorage.setItem(sessionId, JSON.stringify(nextSession));
      } catch (e) {
        console.error('Error saving maintenance session:', e);
      }
    },
    [sessionId],
  );

  const clearPersistTimeout = useCallback(() => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }
  }, []);

  const schedulePersist = useCallback(
    (nextSession: MaintenanceSession) => {
      latestSessionRef.current = nextSession;
      clearPersistTimeout();
      persistTimeoutRef.current = setTimeout(() => {
        const snapshot = latestSessionRef.current;
        persistTimeoutRef.current = null;
        if (!snapshot) return;
        void persistNow(snapshot);
      }, PERSIST_DEBOUNCE_MS);
    },
    [clearPersistTimeout, persistNow],
  );

  const flushSession = useCallback(async () => {
    clearPersistTimeout();
    const snapshot = latestSessionRef.current;
    if (!snapshot) return;
    await persistNow(snapshot);
  }, [clearPersistTimeout, persistNow]);

  // Load session from storage
  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      const context = initialContextRef.current;

      try {
        const stored = await AsyncStorage.getItem(sessionId);
        if (stored) {
          const loadedSession = JSON.parse(stored) as MaintenanceSession;

          // Migration/Fallback for older sessions
          const hydratedSession: MaintenanceSession = {
            ...loadedSession,
            itemObservations: loadedSession.itemObservations || {},
            recommendations: loadedSession.recommendations || '',
            conclusions: loadedSession.conclusions || '',
            // Keep context already persisted, but fallback to incoming context if absent
            building: loadedSession.building || context?.building,
            maintenanceType:
              loadedSession.maintenanceType || context?.maintenanceType,
            propertyId: loadedSession.propertyId || context?.propertyId,
            propertyName: loadedSession.propertyName || context?.propertyName,
            sessionTotal: loadedSession.sessionTotal ?? context?.sessionTotal,
            sessionCompleted:
              loadedSession.sessionCompleted ?? context?.sessionCompleted,
            sessionDate: loadedSession.sessionDate || context?.sessionDate,
          };

          if (!isActive) return;
          latestSessionRef.current = hydratedSession;
          setSession(hydratedSession);
        } else {
          // Initialize new session
          const newSession: MaintenanceSession = {
            sessionId,
            maintenanceId,
            panelId,
            startTime: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            prePhotos: [],
            postPhotos: [],
            checklist: {},
            itemObservations: {},
            observations: '',
            recommendations: '',
            conclusions: '',
            currentStep: 'pre-photos',
            isUploaded: false,
            // Context
            building: context?.building,
            maintenanceType: context?.maintenanceType,
            propertyId: context?.propertyId,
            propertyName: context?.propertyName,
            // Session context for last equipment detection
            sessionTotal: context?.sessionTotal,
            sessionCompleted: context?.sessionCompleted,
            sessionDate: context?.sessionDate,
          };
          if (!isActive) return;
          latestSessionRef.current = newSession;
          setSession(newSession);
          await persistNow(newSession);
        }
      } catch (e) {
        console.error('Error loading maintenance session:', e);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };

    if (panelId) {
      setLoading(true);
      loadSession();
    } else {
      setLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [maintenanceId, panelId, sessionId, persistNow]);

  useEffect(
    () => () => {
      clearPersistTimeout();
      const snapshot = latestSessionRef.current;
      if (!snapshot) return;
      void persistNow(snapshot);
    },
    [clearPersistTimeout, persistNow],
  );

  // Persist session changes
  const saveSession = useCallback(
    async (updatedSession: MaintenanceSession, options?: SaveOptions) => {
      latestSessionRef.current = updatedSession;
      setSession(updatedSession);

      if (options?.immediate) {
        clearPersistTimeout();
        await persistNow(updatedSession);
        return;
      }

      schedulePersist(updatedSession);
    },
    [clearPersistTimeout, persistNow, schedulePersist],
  );

  const updateSession = useCallback(
    async (
      updater: (prevSession: MaintenanceSession) => MaintenanceSession,
      options?: SaveOptions,
    ) => {
      const current = latestSessionRef.current;
      if (!current) return;

      const nextSession = updater(current);
      latestSessionRef.current = nextSession;
      setSession(nextSession);

      if (options?.immediate) {
        clearPersistTimeout();
        await persistNow(nextSession);
        return;
      }

      schedulePersist(nextSession);
    },
    [clearPersistTimeout, persistNow, schedulePersist],
  );

  const addPhoto = useCallback(
    (step: 'pre' | 'post', photo: PhotoItem) => {
      void updateSession(
        prevSession => ({
          ...prevSession,
          prePhotos:
            step === 'pre'
              ? [...prevSession.prePhotos, photo]
              : prevSession.prePhotos,
          postPhotos:
            step === 'post'
              ? [...prevSession.postPhotos, photo]
              : prevSession.postPhotos,
          lastUpdated: new Date().toISOString(),
        }),
        { immediate: true },
      );
    },
    [updateSession],
  );

  const removePhoto = useCallback(
    (step: 'pre' | 'post', photoId: string) => {
      void updateSession(
        prevSession => ({
          ...prevSession,
          prePhotos:
            step === 'pre'
              ? prevSession.prePhotos.filter(p => p.id !== photoId)
              : prevSession.prePhotos,
          postPhotos:
            step === 'post'
              ? prevSession.postPhotos.filter(p => p.id !== photoId)
              : prevSession.postPhotos,
          lastUpdated: new Date().toISOString(),
        }),
        { immediate: true },
      );
    },
    [updateSession],
  );

  const clearSession = useCallback(async () => {
    try {
      clearPersistTimeout();
      latestSessionRef.current = null;
      await AsyncStorage.removeItem(sessionId);
      setSession(null);
    } catch (e) {
      console.error('Error clearing session:', e);
    }
  }, [clearPersistTimeout, sessionId]);

  return {
    session,
    loading,
    addPhoto,
    removePhoto,
    clearSession,
    updateSession,
    flushSession,
    saveSession, // Expose generic save for flexibility
  };
};
