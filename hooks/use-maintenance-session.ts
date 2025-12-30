import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MaintenanceSession,
  PhotoItem,
  MaintenanceStep,
} from '../types/maintenance-session';

const STORAGE_KEY_PREFIX = 'maintenance_session_';

export const useMaintenanceSession = (
  panelId: string,
  maintenanceId?: string,
) => {
  const [session, setSession] = useState<MaintenanceSession | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = `${STORAGE_KEY_PREFIX}${panelId}_${maintenanceId || 'adhoc'}`;

  // Load session from storage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(sessionId);
        if (stored) {
          const loadedSession = JSON.parse(stored);
          // Migration/Fallback for older sessions
          if (!loadedSession.itemObservations) {
            loadedSession.itemObservations = {};
          }
          setSession(loadedSession);
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
            currentStep: 'pre-photos',
            isUploaded: false,
          };
          setSession(newSession);
          await AsyncStorage.setItem(sessionId, JSON.stringify(newSession));
        }
      } catch (e) {
        console.error('Error loading maintenance session:', e);
      } finally {
        setLoading(false);
      }
    };

    if (panelId) {
      loadSession();
    }
  }, [panelId, maintenanceId, sessionId]);

  // Persist session changes
  const saveSession = useCallback(
    async (updatedSession: MaintenanceSession) => {
      setSession(updatedSession);
      try {
        await AsyncStorage.setItem(sessionId, JSON.stringify(updatedSession));
      } catch (e) {
        console.error('Error saving maintenance session:', e);
      }
    },
    [sessionId],
  );

  const addPhoto = useCallback(
    (step: 'pre' | 'post', photo: PhotoItem) => {
      if (!session) return;

      const updatedSession = { ...session };
      if (step === 'pre') {
        updatedSession.prePhotos = [...updatedSession.prePhotos, photo];
      } else {
        updatedSession.postPhotos = [...updatedSession.postPhotos, photo];
      }
      updatedSession.lastUpdated = new Date().toISOString();
      saveSession(updatedSession);
    },
    [session, saveSession],
  );

  const removePhoto = useCallback(
    (step: 'pre' | 'post', photoId: string) => {
      if (!session) return;

      const updatedSession = { ...session };
      if (step === 'pre') {
        updatedSession.prePhotos = updatedSession.prePhotos.filter(
          p => p.id !== photoId,
        );
      } else {
        updatedSession.postPhotos = updatedSession.postPhotos.filter(
          p => p.id !== photoId,
        );
      }
      updatedSession.lastUpdated = new Date().toISOString();
      saveSession(updatedSession);
    },
    [session, saveSession],
  );

  const clearSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(sessionId);
      setSession(null);
    } catch (e) {
      console.error('Error clearing session:', e);
    }
  }, [sessionId]);

  return {
    session,
    loading,
    addPhoto,
    removePhoto,
    clearSession,
    saveSession, // Expose generic save for flexibility
  };
};
