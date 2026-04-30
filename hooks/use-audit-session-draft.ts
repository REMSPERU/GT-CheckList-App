import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuditSessionDraft } from '@/types/auditoria';

const STORAGE_KEY_PREFIX = 'audit_session_draft_';
const PERSIST_DEBOUNCE_MS = 500;

/**
 * Manages local AsyncStorage persistence for an in-progress audit session.
 * Follows the same debounced-persist + flush-on-unmount pattern used by
 * `use-maintenance-session.ts`.
 *
 * Call `schedulePersist(draft)` from handlers to queue a debounced write.
 * Call `flushDraft()` for an immediate write (e.g. "Guardar borrador").
 * Call `clearDraft()` after successful submit or "Descartar".
 */
export function useAuditSessionDraft(buildingId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${buildingId}`;
  const latestDraftRef = useRef<AuditSessionDraft | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPersistTimeout = useCallback(() => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }
  }, []);

  const persistNow = useCallback(
    async (draft: AuditSessionDraft) => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(draft));
      } catch (error) {
        console.error('Error saving audit draft:', error);
      }
    },
    [storageKey],
  );

  /** Queue a debounced write. Safe to call on every state change. */
  const schedulePersist = useCallback(
    (draft: AuditSessionDraft) => {
      latestDraftRef.current = draft;
      clearPersistTimeout();
      persistTimeoutRef.current = setTimeout(() => {
        const snapshot = latestDraftRef.current;
        persistTimeoutRef.current = null;
        if (!snapshot) return;
        void persistNow(snapshot);
      }, PERSIST_DEBOUNCE_MS);
    },
    [clearPersistTimeout, persistNow],
  );

  /** Immediately write whatever is in the ref. Use before navigation. */
  const flushDraft = useCallback(async () => {
    clearPersistTimeout();
    const snapshot = latestDraftRef.current;
    if (!snapshot) return;
    await persistNow(snapshot);
  }, [clearPersistTimeout, persistNow]);

  /** Load existing draft from storage. Returns null when nothing stored. */
  const loadDraft = useCallback(async (): Promise<AuditSessionDraft | null> => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as AuditSessionDraft;

      // Validate required shape to avoid hydrating corrupted data
      if (!parsed.buildingId || !parsed.answers) return null;

      latestDraftRef.current = parsed;
      return parsed;
    } catch (error) {
      console.error('Error loading audit draft:', error);
      return null;
    }
  }, [storageKey]);

  /** Remove the draft completely. Use after submit or discard. */
  const clearDraft = useCallback(async () => {
    clearPersistTimeout();
    latestDraftRef.current = null;
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing audit draft:', error);
    }
  }, [clearPersistTimeout, storageKey]);

  // Flush on unmount to avoid data loss when the component is removed
  useEffect(
    () => () => {
      clearPersistTimeout();
      const snapshot = latestDraftRef.current;
      if (!snapshot) return;
      void persistNow(snapshot);
    },
    [clearPersistTimeout, persistNow],
  );

  return { loadDraft, schedulePersist, flushDraft, clearDraft };
}
