import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
  Alert,
  TextInput,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { ensureImagePermission } from '@/lib/image-permissions';
import { useAuth } from '../../../../contexts/AuthContext';
import { DatabaseService } from '../../../../services/db';
import { syncService } from '../../../../services/sync';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Types ───────────────────────────────────────────────────────────

interface ChecklistItem {
  value: boolean;
  observation: string;
  photo: string | null;
}

interface Instrument {
  id: string;
  instrumento: string;
  marca: string;
  modelo: string;
  serie: string;
}

type InspectionItemKey =
  | 'wellMeasurement'
  | 'hasSignage'
  | 'wellLabeling'
  | 'connectorsOk'
  | 'hasAccess';

type MaintenanceType = 'conventional' | 'conductive-cement' | null;
type ExecutionStatus = 'completed' | 'reprogrammed';

interface GroundingWellSession {
  executionStatus: ExecutionStatus;
  reprogramComment: string;
  reprogramPhoto: string | null;
  selectedInstruments: Instrument[];
  preMeasurement: string;
  preMeasurementPhoto: string | null;
  greaseApplicationPhoto: string | null;
  maintenanceType: MaintenanceType;
  thorGelPhoto: string | null;
  postMeasurement: string;
  postMeasurementPhoto: string | null;
  generalObservation: string;
  lidStatus: 'good' | 'bad' | null;
  lidStatusObservation: string;
  lidStatusPhoto: string | null;
  wellMeasurement: ChecklistItem;
  hasSignage: ChecklistItem;
  wellLabeling: ChecklistItem;
  connectorsOk: ChecklistItem;
  hasAccess: ChecklistItem;
}

type SaveStatus =
  | 'sin-cambios'
  | 'pendiente-local'
  | 'guardado-local'
  | 'sincronizando'
  | 'sincronizado'
  | 'error-sync';

interface GroundingWellLocalSyncState {
  status?: string | null;
  error_message?: string | null;
  synced_at?: string | null;
}

type DirectPhotoKey =
  | 'reprogramEvidence'
  | 'lidStatus'
  | 'preMeasurement'
  | 'greaseApplication'
  | 'thorGel'
  | 'postMeasurement';

// ─── Constants ───────────────────────────────────────────────────────

const COLORS = {
  primary: '#0891B2',
  primaryLight: '#E0F7FA',
  primarySoft: '#B2EBF2',
  accent: '#06B6D4',
  bg: '#F9FAFB',
  white: '#FFFFFF',
  text: '#11181C',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#10B981',
  error: '#EF4444',
} as const;

const defaultItem: ChecklistItem = {
  value: true,
  observation: '',
  photo: null,
};

const defaultSession: GroundingWellSession = {
  executionStatus: 'completed',
  reprogramComment: '',
  reprogramPhoto: null,
  selectedInstruments: [],
  preMeasurement: '',
  preMeasurementPhoto: null,
  greaseApplicationPhoto: null,
  maintenanceType: null,
  thorGelPhoto: null,
  postMeasurement: '',
  postMeasurementPhoto: null,
  generalObservation: '',
  lidStatus: 'good',
  lidStatusObservation: '',
  lidStatusPhoto: null,
  wellMeasurement: {
    ...defaultItem,
    observation: 'DENTRO DEL RANGO PERMITIDO',
  },
  hasSignage: { ...defaultItem },
  wellLabeling: { ...defaultItem },
  connectorsOk: { ...defaultItem },
  hasAccess: { ...defaultItem },
};

const LID_STATUS_TEXT = {
  good: '',
  bad: 'MAL ESTADO',
} as const;

const INSPECTION_STATUS_MAP: Record<
  InspectionItemKey,
  { ok: string; obs: string }
> = {
  wellMeasurement: {
    ok: 'DENTRO DEL RANGO PERMITIDO',
    obs: 'FUERA DEL RANGO PERMITIDO',
  },
  hasSignage: {
    ok: '',
    obs: 'NO CUENTA',
  },
  wellLabeling: {
    ok: '',
    obs: 'NO CUENTA / MAL ESTADO',
  },
  connectorsOk: {
    ok: '',
    obs: 'Mal estado',
  },
  hasAccess: {
    ok: '',
    obs: 'NO CUENTA',
  },
};

const STORAGE_KEY_PREFIX = 'grounding_well_session_';
const SYNC_TIMEOUT_MS = 15000;
const MAX_REPROGRAM_COMMENT_LENGTH = 220;
const MAX_GENERAL_OBSERVATION_LENGTH = 280;
const PORTRAIT_EXIF_ORIENTATIONS = new Set([5, 6, 7, 8]);

function getExifOrientation(
  asset: ImagePicker.ImagePickerAsset,
): number | null {
  const exif = asset.exif as Record<string, unknown> | null | undefined;
  const rawOrientation = exif?.Orientation;

  if (typeof rawOrientation !== 'number') {
    return null;
  }

  return rawOrientation;
}

// ─── Memoized Sub-Components ─────────────────────────────────────────

interface PhotoButtonProps {
  onPress: () => void;
  hasPhoto: boolean;
  compact?: boolean;
}

const PhotoButton = memo(function PhotoButton({
  onPress,
  hasPhoto,
  compact,
}: PhotoButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.photoButton,
        compact && styles.photoButtonCompact,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button">
      <Ionicons
        name="camera-outline"
        size={compact ? 16 : 18}
        color={COLORS.primary}
      />
      <Text
        style={[
          styles.photoButtonText,
          compact && styles.photoButtonTextCompact,
        ]}>
        {hasPhoto ? 'Cambiar foto' : 'Tomar foto'}
      </Text>
    </Pressable>
  );
});

interface PhotoThumbnailProps {
  uri: string;
}

const PhotoThumbnail = memo(function PhotoThumbnail({
  uri,
}: PhotoThumbnailProps) {
  return (
    <Image
      source={{ uri }}
      style={styles.thumbnail}
      contentFit="cover"
      transition={100}
    />
  );
});

interface TypeOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

type MdiIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TypeOption = memo(function TypeOption({
  label,
  selected,
  onPress,
}: TypeOptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.typeButton,
        selected && styles.typeButtonSelected,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button">
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text
        style={[
          styles.typeButtonText,
          selected && styles.typeButtonTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
});

// ─── Main Component ──────────────────────────────────────────────────

export default function GroundingWellChecklistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId?: string | string[];
    maintenanceId?: string | string[];
    propertyId?: string | string[];
    propertyName?: string | string[];
    sessionId?: string | string[];
  }>();
  const { user } = useAuth();
  const normalizeParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const panelId = normalizeParam(params.panelId) || '';
  const rawMaintenanceId = normalizeParam(params.maintenanceId);
  const propertyId = normalizeParam(params.propertyId) || '';
  const propertyName = normalizeParam(params.propertyName) || '';
  const sessionId = normalizeParam(params.sessionId) || '';
  const maintenanceId =
    rawMaintenanceId &&
    rawMaintenanceId !== 'null' &&
    rawMaintenanceId !== 'undefined'
      ? rawMaintenanceId
      : undefined;
  const sessionKey = useMemo(
    () => `${STORAGE_KEY_PREFIX}${panelId}_${maintenanceId || 'adhoc'}`,
    [panelId, maintenanceId],
  );

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [data, setData] = useState<GroundingWellSession>(defaultSession);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('sin-cambios');
  const [statusMessage, setStatusMessage] = useState('Sin cambios pendientes');
  const [latestChecklistLocalId, setLatestChecklistLocalId] = useState<
    number | null
  >(null);
  const [wellTitle, setWellTitle] = useState('');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(false);
  const dataRef = useRef(data);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const draftLog = useCallback((...args: unknown[]) => {
    if (__DEV__) {
      console.log('[GW Draft]', ...args);
    }
  }, []);

  const persistDraft = useCallback(
    async (
      draft: GroundingWellSession,
      successMessage = 'Borrador guardado localmente',
    ) => {
      try {
        await AsyncStorage.setItem(sessionKey, JSON.stringify(draft));
        setSaveStatus('guardado-local');
        setStatusMessage(successMessage);
        draftLog('Persist save OK', {
          key: sessionKey,
          preMeasurement: draft.preMeasurement,
          hasPreMeasurementPhoto: !!draft.preMeasurementPhoto,
        });
      } catch (error) {
        console.error('Error saving grounding well draft:', error);
      }
    },
    [draftLog, sessionKey],
  );

  const persistDraftSilently = useCallback(
    async (draft: GroundingWellSession) => {
      try {
        await AsyncStorage.setItem(sessionKey, JSON.stringify(draft));
        draftLog('Silent save OK', {
          key: sessionKey,
          preMeasurement: draft.preMeasurement,
          hasPreMeasurementPhoto: !!draft.preMeasurementPhoto,
        });
      } catch (error) {
        console.error('Error silently saving grounding well draft:', error);
      }
    },
    [draftLog, sessionKey],
  );

  const scheduleDraftSave = useCallback(
    (next: GroundingWellSession) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        void persistDraftSilently(next);
        setSaveStatus('guardado-local');
        setStatusMessage('Borrador guardado automáticamente');
        draftLog('Auto-save timer flushed', {
          key: sessionKey,
          preMeasurement: next.preMeasurement,
          hasPreMeasurementPhoto: !!next.preMeasurementPhoto,
        });
      }, 450);
    },
    [draftLog, persistDraftSilently, sessionKey],
  );

  const updateData = useCallback(
    (
      updates: Partial<GroundingWellSession>,
      options?: { persistDraft?: boolean },
    ) => {
      setData(prev => {
        const next = { ...prev, ...updates };
        dataRef.current = next;
        if (options?.persistDraft) {
          void persistDraft(next);
        } else {
          scheduleDraftSave(next);
        }
        return next;
      });

      if (options?.persistDraft) return;
      setSaveStatus('pendiente-local');
      setStatusMessage('Cambios pendientes por guardar en el celular');
    },
    [persistDraft, scheduleDraftSave],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        draftLog('Bootstrapping draft with key:', sessionKey);
        const stored = await AsyncStorage.getItem(sessionKey);
        if (!stored || !active) {
          draftLog('No draft found for key:', sessionKey);
          return;
        }

        const parsed = JSON.parse(stored) as Partial<GroundingWellSession>;
        const restored = { ...defaultSession, ...parsed };
        setData(restored);
        dataRef.current = restored;
        setSaveStatus('guardado-local');
        setStatusMessage('Borrador restaurado desde el celular');
        draftLog('Draft restored for key:', sessionKey, {
          preMeasurement: restored.preMeasurement,
          hasPreMeasurementPhoto: !!restored.preMeasurementPhoto,
        });
      } catch (error) {
        console.error('Error loading grounding well draft:', error);
      } finally {
        if (active) {
          setInitializing(false);
          setHydrated(true);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void persistDraftSilently(dataRef.current);
    };
  }, [draftLog, persistDraftSilently, sessionKey]);

  const persistCurrentDraft = useCallback(() => {
    if (!hydrated) return;
    void persistDraft(data);
  }, [data, hydrated, persistDraft]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!hydrated) return;
    draftLog('Draft hydration completed for key:', sessionKey);
  }, [draftLog, hydrated, sessionKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (!hydrated) return;
        if (nextState === 'background' || nextState === 'inactive') {
          void persistDraft(
            dataRef.current,
            'Borrador guardado al salir de la app',
          );
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [hydrated, persistDraft]);

  useEffect(() => {
    if (!panelId) {
      setWellTitle('');
      return;
    }

    let active = true;
    const loadWellInfo = async () => {
      try {
        const equipment = (await DatabaseService.getEquipmentById(panelId)) as {
          codigo?: string;
          id_equipamento?: string;
          equipment_detail?: { rotulo?: string } | null;
        } | null;

        if (!active) return;

        const code = equipment?.codigo?.trim();
        const label = equipment?.equipment_detail?.rotulo?.trim();
        setWellTitle(code || label || panelId);

        if (equipment?.id_equipamento) {
          setIsLoadingInstruments(true);
          try {
            const loaded = await DatabaseService.getInstrumentsByEquipmentType(
              equipment.id_equipamento,
            );
            if (!active) return;
            setInstruments((loaded || []) as Instrument[]);
          } catch (error) {
            console.error('Error loading grounding well instruments:', error);
            if (active) {
              setInstruments([]);
            }
          } finally {
            if (active) {
              setIsLoadingInstruments(false);
            }
          }
        } else if (active) {
          setInstruments([]);
        }
      } catch (error) {
        console.error('Error loading grounding well info:', error);
        if (active) {
          setWellTitle(panelId);
          setInstruments([]);
          setIsLoadingInstruments(false);
        }
      }
    };

    loadWellInfo();
    return () => {
      active = false;
    };
  }, [panelId]);

  const selectedInstrumentIds = useMemo(
    () => new Set((data.selectedInstruments || []).map(item => item.id)),
    [data.selectedInstruments],
  );

  const handleToggleInstrument = useCallback(
    (instrument: Instrument) => {
      const current = data.selectedInstruments || [];
      const hasSelected = current.some(item => item.id === instrument.id);

      const next = hasSelected
        ? current.filter(item => item.id !== instrument.id)
        : [
            ...current.filter(
              item => item.instrumento !== instrument.instrumento,
            ),
            instrument,
          ];

      updateData({ selectedInstruments: next }, { persistDraft: true });
    },
    [data.selectedInstruments, updateData],
  );

  const takePhoto = useCallback(
    async (itemKey: keyof GroundingWellSession | DirectPhotoKey) => {
      const hasCameraPermission = await ensureImagePermission('camera', {
        deniedMessage: 'Se necesita acceso a la camara para tomar fotos.',
      });
      if (!hasCameraPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
        allowsEditing: false,
        aspect: [4, 3],
        exif: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const exifOrientation = getExifOrientation(asset);
      const isPortrait =
        asset.height > asset.width ||
        (exifOrientation !== null &&
          PORTRAIT_EXIF_ORIENTATIONS.has(exifOrientation));

      if (isPortrait) {
        Alert.alert(
          'Foto en vertical detectada',
          'Para que salga bien en el informe, toma la foto en horizontal (celular de costado) y vuelve a intentarlo.',
        );
        return;
      }

      const uri = asset.uri;
      const directPhotoMap: Record<DirectPhotoKey, string> = {
        reprogramEvidence: 'reprogramPhoto',
        lidStatus: 'lidStatusPhoto',
        preMeasurement: 'preMeasurementPhoto',
        greaseApplication: 'greaseApplicationPhoto',
        thorGel: 'thorGelPhoto',
        postMeasurement: 'postMeasurementPhoto',
      };

      const photoField = directPhotoMap[itemKey as DirectPhotoKey];
      if (photoField) {
        updateData({ [photoField]: uri } as Partial<GroundingWellSession>, {
          persistDraft: true,
        });
      } else {
        const checklistKey = itemKey as InspectionItemKey;

        setData(prev => {
          const item = prev[checklistKey];
          const next = { ...prev, [checklistKey]: { ...item, photo: uri } };
          dataRef.current = next;
          scheduleDraftSave(next);
          void persistDraft(next);
          return next;
        });
      }
    },
    [persistDraft, scheduleDraftSave, updateData],
  );

  const checklistKeys = useMemo<InspectionItemKey[]>(
    () => [
      'wellMeasurement',
      'hasSignage',
      'wellLabeling',
      'connectorsOk',
      'hasAccess',
    ],
    [],
  );

  const withTimeout = useCallback(
    <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SYNC_TIMEOUT'));
        }, timeoutMs);

        promise
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });
    },
    [],
  );

  const getReadableSyncError = useCallback((error: unknown) => {
    if (error instanceof Error) return error.message;

    if (typeof error === 'string') return error;

    if (error && typeof error === 'object') {
      const candidate = error as {
        message?: string;
        error_description?: string;
        details?: string;
        hint?: string;
      };

      if (candidate.message) return candidate.message;
      if (candidate.error_description) return candidate.error_description;
      if (candidate.details) return candidate.details;
      if (candidate.hint) return candidate.hint;

      try {
        return JSON.stringify(error);
      } catch {
        return 'Error desconocido al sincronizar';
      }
    }

    return 'Error desconocido al sincronizar';
  }, []);

  const refreshGroundingWellSyncStatus = useCallback(
    async (localId: number, fallbackError?: string | null) => {
      const localSyncState =
        (await DatabaseService.getGroundingWellChecklistByLocalId(
          localId,
        )) as GroundingWellLocalSyncState | null;

      if (!localSyncState) {
        setSaveStatus('guardado-local');
        setStatusMessage('Guardado local. Se reintentara automaticamente');
        return;
      }

      if (localSyncState.status === 'synced') {
        setSaveStatus('sincronizado');
        setStatusMessage('Checklist sincronizado correctamente');
        return;
      }

      if (localSyncState.status === 'syncing') {
        setSaveStatus('sincronizando');
        setStatusMessage('Sincronizacion en progreso en segundo plano');
        return;
      }

      if (localSyncState.status === 'error') {
        setSaveStatus('error-sync');
        setStatusMessage(
          `Error al sincronizar: ${localSyncState.error_message || 'sin detalle'}`,
        );
        return;
      }

      if (fallbackError) {
        setSaveStatus('error-sync');
        setStatusMessage(`Error al sincronizar: ${fallbackError}`);
        return;
      }

      setSaveStatus('guardado-local');
      setStatusMessage('Guardado local. Pendiente de sincronizar');
    },
    [],
  );

  const navigateToParent = useCallback(() => {
    if (propertyId && sessionId) {
      router.replace({
        pathname:
          '/maintenance/scheduled_maintenance/equipment-maintenance-list',
        params: {
          propertyId,
          sessionId,
          propertyName,
        },
      });
      return;
    }

    if (propertyId) {
      router.replace({
        pathname: '/maintenance/scheduled_maintenance/maintenance-session',
        params: {
          propertyId,
          propertyName,
        },
      });
      return;
    }

    router.replace('/maintenance');
  }, [propertyId, propertyName, router, sessionId]);

  const navigateAfterSave = useCallback(() => {
    navigateToParent();
  }, [navigateToParent]);

  const syncInBackground = useCallback(
    async (localId: number) => {
      setSaveStatus('sincronizando');
      setStatusMessage('Sincronizando con el servidor...');
      let fallbackErrorMessage: string | null = null;

      try {
        await withTimeout(syncService.pushData(), SYNC_TIMEOUT_MS);
        await syncService.pullData(true);
      } catch (syncError) {
        console.error('Grounding well background sync failed:', syncError);
        const readableError = getReadableSyncError(syncError);
        fallbackErrorMessage = readableError;
        setSaveStatus('error-sync');
        setStatusMessage(`Error al sincronizar: ${readableError}`);
      } finally {
        try {
          await refreshGroundingWellSyncStatus(localId, fallbackErrorMessage);
        } catch (statusError) {
          console.error(
            'Failed to check local grounding sync status:',
            statusError,
          );
        }
      }
    },
    [getReadableSyncError, refreshGroundingWellSyncStatus, withTimeout],
  );

  useEffect(() => {
    if (!maintenanceId) return;

    let active = true;

    const loadLatestOfflineSyncState = async () => {
      try {
        const latest =
          (await DatabaseService.getLatestOfflineGroundingWellChecklistByMaintenanceId(
            maintenanceId,
          )) as { local_id?: number | string } | null;

        if (!active || !latest?.local_id) return;

        const parsedLocalId = Number(latest.local_id);
        if (!Number.isFinite(parsedLocalId)) return;

        setLatestChecklistLocalId(parsedLocalId);
        await refreshGroundingWellSyncStatus(parsedLocalId);
      } catch (error) {
        console.error('Error loading latest grounding sync state:', error);
      }
    };

    void loadLatestOfflineSyncState();

    return () => {
      active = false;
    };
  }, [maintenanceId, refreshGroundingWellSyncStatus]);

  const handleContinue = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'No se ha podido identificar al usuario.');
      return;
    }

    if (!panelId) {
      Alert.alert(
        'Error',
        'No se encontró el identificador del pozo a tierra.',
      );
      return;
    }

    const isReprogrammed = data.executionStatus === 'reprogrammed';
    const selectedInstrumentCount = Array.isArray(data.selectedInstruments)
      ? data.selectedInstruments.length
      : 0;

    if (isReprogrammed && !data.reprogramComment.trim()) {
      Alert.alert(
        'Campo requerido',
        'Ingrese un comentario para registrar la reprogramación.',
      );
      return;
    }

    if (!isReprogrammed) {
      const requiredChecks: [boolean, string][] = [
        [
          instruments.length > 0 && selectedInstrumentCount === 0,
          'Seleccione al menos un instrumento de medición.',
        ],
        [
          !data.preMeasurement.trim(),
          'Ingrese la medición pre-mantenimiento (ohmios).',
        ],
        [
          !data.preMeasurementPhoto,
          'Tome una foto de la medición pre-mantenimiento.',
        ],
        [
          !data.greaseApplicationPhoto,
          'Tome una foto de la aplicación de grasa.',
        ],
        [!data.maintenanceType, 'Seleccione el tipo de mantenimiento.'],
        [
          data.maintenanceType === 'conventional' && !data.thorGelPhoto,
          'Tome una foto de la aplicación de Thor Gel.',
        ],
        [
          !data.postMeasurement.trim(),
          'Ingrese la medición post-mantenimiento (ohmios).',
        ],
        [
          !data.postMeasurementPhoto,
          'Tome una foto de la medición post-mantenimiento.',
        ],
        [data.lidStatus === null, 'Seleccione el estado de la tapa.'],
      ];

      for (const [condition, message] of requiredChecks) {
        if (condition) {
          Alert.alert('Campo requerido', message);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const photosToSave: { uri: string; itemKey: string }[] = [];
      const dataToSave = JSON.parse(JSON.stringify(data));

      dataToSave.lidStatusObservation =
        dataToSave.lidStatus === 'good'
          ? LID_STATUS_TEXT.good
          : LID_STATUS_TEXT.bad;
      checklistKeys.forEach(key => {
        const item = dataToSave[key] as ChecklistItem;
        item.observation = item.value
          ? INSPECTION_STATUS_MAP[key].ok
          : INSPECTION_STATUS_MAP[key].obs;
      });

      // Recolectar fotos directas
      const directPhotos: [string, string][] = [
        ['reprogramPhoto', 'reprogramEvidence'],
        ['preMeasurementPhoto', 'preMeasurement'],
        ['greaseApplicationPhoto', 'greaseApplication'],
        ['thorGelPhoto', 'thorGel'],
        ['postMeasurementPhoto', 'postMeasurement'],
        ['lidStatusPhoto', 'lidStatus'],
      ];
      for (const [field, itemKey] of directPhotos) {
        if (dataToSave[field]) {
          photosToSave.push({ uri: dataToSave[field], itemKey });
          dataToSave[field] = null;
        }
      }

      // Recolectar fotos de checklist items
      for (const key of checklistKeys) {
        const item = dataToSave[key] as ChecklistItem;
        if (item.photo) {
          photosToSave.push({ uri: item.photo, itemKey: key as string });
          item.photo = null;
        }
      }

      const localId = await DatabaseService.saveOfflineGroundingWellChecklist(
        panelId,
        maintenanceId || null,
        dataToSave,
        user.id,
        photosToSave,
      );

      if (localId === null) {
        throw new Error('No se pudo obtener localId del checklist guardado');
      }

      setLatestChecklistLocalId(localId);

      await AsyncStorage.removeItem(sessionKey);
      setSaveStatus('guardado-local');
      setStatusMessage(
        data.executionStatus === 'reprogrammed'
          ? 'Pozo reprogramado. Pendiente de sincronizar'
          : 'Guardado local. Pendiente de sincronizar',
      );

      if (maintenanceId) {
        await DatabaseService.updateLocalScheduledMaintenanceStatus(
          maintenanceId,
          'FINALIZADO',
        );
      }

      const network = await NetInfo.fetch();
      const isOnline =
        !!network.isConnected && network.isInternetReachable !== false;

      if (!isOnline) {
        navigateAfterSave();
        return;
      }

      void syncInBackground(localId);
      navigateAfterSave();
    } catch (error) {
      console.error('Error saving grounding well checklist:', error);
      setSaveStatus('pendiente-local');
      setStatusMessage('No se pudo guardar. Intenta nuevamente');
      Alert.alert(
        'Error',
        'No se pudo guardar el checklist. Intente de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    checklistKeys,
    data,
    instruments.length,
    maintenanceId,
    navigateAfterSave,
    panelId,
    sessionKey,
    syncInBackground,
    user,
  ]);

  const handleManualRetrySync = useCallback(() => {
    if (saveStatus === 'sincronizando') {
      return;
    }

    if (latestChecklistLocalId === null) {
      Alert.alert(
        'Sin registro local',
        'Aun no hay un checklist local pendiente para reintentar sincronizacion.',
      );
      return;
    }

    void syncInBackground(latestChecklistLocalId);
  }, [latestChecklistLocalId, saveStatus, syncInBackground]);

  // ─── Render Helpers ──────────────────────────────────────────────

  const renderToggleItem = useCallback(
    (label: string, itemKey: InspectionItemKey, iconName: MdiIconName) => {
      const item = data[itemKey] as ChecklistItem;
      const statusText = item.value
        ? INSPECTION_STATUS_MAP[itemKey].ok
        : INSPECTION_STATUS_MAP[itemKey].obs;
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={16}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.labelSmall}>{label}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text
                style={[
                  styles.statusBadge,
                  item.value ? styles.statusBadgeOk : styles.statusBadgeBad,
                ]}>
                {item.value ? 'OK' : 'OBS'}
              </Text>
              <Switch
                value={item.value}
                onValueChange={value =>
                  updateData(
                    {
                      [itemKey]: {
                        ...item,
                        value,
                        observation: value
                          ? INSPECTION_STATUS_MAP[itemKey].ok
                          : INSPECTION_STATUS_MAP[itemKey].obs,
                        photo: value ? null : item.photo,
                      },
                    },
                    { persistDraft: true },
                  )
                }
                trackColor={{ false: '#E5E7EB', true: COLORS.primarySoft }}
                thumbColor={item.value ? COLORS.primary : '#D1D5DB'}
                style={styles.switchSmall}
              />
            </View>
          </View>
          {!!statusText && (
            <View style={styles.statusDescriptionBox}>
              <Text style={styles.statusDescriptionLabel}>Estado</Text>
              <Text style={styles.statusDescription}>{statusText}</Text>
            </View>
          )}
          {!item.value && (
            <>
              <PhotoButton
                onPress={() => takePhoto(itemKey)}
                hasPhoto={!!item.photo}
                compact
              />
              <Text style={styles.optionalHint}>Foto opcional</Text>
              {item.photo && <PhotoThumbnail uri={item.photo} />}
            </>
          )}
        </View>
      );
    },
    [data, takePhoto, updateData],
  );

  if (loading || initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            void persistDraftSilently(dataRef.current);
            navigateToParent();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Pozo a Tierra</Text>
          {!!wellTitle && (
            <Text style={styles.headerSubtitle}>{wellTitle}</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ═══ SECCIÓN: Mediciones y Mantenimiento ═══ */}
        <Text style={styles.sectionTitle}>Mediciones y Mantenimiento</Text>

        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="calendar-refresh-outline"
                size={16}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.labelSmall}>Resultado de la Ejecución</Text>
          </View>
          <View style={styles.typeContainer}>
            <TypeOption
              label="Completado"
              selected={data.executionStatus === 'completed'}
              onPress={() =>
                updateData(
                  {
                    executionStatus: 'completed',
                    reprogramComment: '',
                    reprogramPhoto: null,
                  },
                  { persistDraft: true },
                )
              }
            />
            <TypeOption
              label="Reprogramado"
              selected={data.executionStatus === 'reprogrammed'}
              onPress={() =>
                updateData(
                  { executionStatus: 'reprogrammed' },
                  { persistDraft: true },
                )
              }
            />
          </View>

          {data.executionStatus === 'reprogrammed' && (
            <>
              <View style={styles.photoOrientationHintBox}>
                <Ionicons
                  name="phone-landscape-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.photoOrientationHintText}>
                  Toma la foto en horizontal para evitar que salga volteada en
                  el informe.
                </Text>
              </View>
              <TextInput
                style={styles.obsInput}
                placeholder="Indique por qué no se pudo concretar..."
                placeholderTextColor={COLORS.textMuted}
                value={data.reprogramComment}
                onChangeText={text => updateData({ reprogramComment: text })}
                onBlur={persistCurrentDraft}
                maxLength={MAX_REPROGRAM_COMMENT_LENGTH}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <PhotoButton
                onPress={() => takePhoto('reprogramEvidence')}
                hasPhoto={!!data.reprogramPhoto}
                compact
              />
              <Text style={styles.optionalHint}>
                Foto de sustento (opcional)
              </Text>
              {data.reprogramPhoto && (
                <PhotoThumbnail uri={data.reprogramPhoto} />
              )}
              <Text style={styles.reprogramHint}>
                Se registrará como reprogramado en el informe y quedará
                finalizado para continuar con el cierre de la sesión.
              </Text>
            </>
          )}
        </View>

        {data.executionStatus !== 'reprogrammed' && (
          <>
            <View style={styles.photoOrientationHintBox}>
              <Ionicons
                name="phone-landscape-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.photoOrientationHintText}>
                Guía de foto: toma siempre en horizontal para que el informe
                mantenga la orientación correcta.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.labelRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="tools"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.labelSmall}>Instrumentos de Medición</Text>
              </View>
              {isLoadingInstruments ? (
                <View style={styles.instrumentLoadingWrap}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.instrumentHelperText}>
                    Cargando instrumentos...
                  </Text>
                </View>
              ) : instruments.length === 0 ? (
                <Text style={styles.instrumentHelperText}>
                  No hay instrumentos asignados para este tipo de equipo.
                </Text>
              ) : (
                <View style={styles.instrumentList}>
                  {instruments.map(item => {
                    const isSelected = selectedInstrumentIds.has(item.id);

                    return (
                      <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                          styles.instrumentCard,
                          isSelected && styles.instrumentCardSelected,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleToggleInstrument(item)}
                        accessibilityRole="button">
                        <View style={styles.instrumentCardHeader}>
                          <Text
                            style={[
                              styles.instrumentTitle,
                              isSelected && styles.instrumentTitleSelected,
                            ]}>
                            {item.instrumento}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color={COLORS.primary}
                            />
                          )}
                        </View>
                        <Text style={styles.instrumentMeta}>
                          Marca: {item.marca}
                        </Text>
                        <Text style={styles.instrumentMeta}>
                          Modelo: {item.modelo}
                        </Text>
                        <Text style={styles.instrumentMeta}>
                          Serie: {item.serie}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 1. Medición Pre */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="gauge"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.labelSmall}>
                  Medición con Telurómetro{' '}
                  <Text style={styles.labelMuted}>(Antes del Mantto)</Text>
                </Text>
              </View>
              <View style={styles.measurementRow}>
                <TextInput
                  style={styles.measurementInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={data.preMeasurement}
                  onChangeText={text => updateData({ preMeasurement: text })}
                  onBlur={persistCurrentDraft}
                  keyboardType="numeric"
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>Ω</Text>
                </View>
              </View>
              <PhotoButton
                onPress={() => takePhoto('preMeasurement')}
                hasPhoto={!!data.preMeasurementPhoto}
              />
              {data.preMeasurementPhoto && (
                <PhotoThumbnail uri={data.preMeasurementPhoto} />
              )}
            </View>

            {/* 2. Aplicación de Grasa */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="oil"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.labelSmall}>Aplicación de Grasa</Text>
              </View>
              <PhotoButton
                onPress={() => takePhoto('greaseApplication')}
                hasPhoto={!!data.greaseApplicationPhoto}
              />
              {data.greaseApplicationPhoto && (
                <PhotoThumbnail uri={data.greaseApplicationPhoto} />
              )}
            </View>

            {/* 3. Tipo de Mantenimiento */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="wrench-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.labelSmall}>Tipo de Mantenimiento</Text>
              </View>
              <View style={styles.typeContainer}>
                <TypeOption
                  label="Convencional"
                  selected={data.maintenanceType === 'conventional'}
                  onPress={() =>
                    updateData(
                      { maintenanceType: 'conventional' },
                      { persistDraft: true },
                    )
                  }
                />
                <TypeOption
                  label="Cemento Conductivo"
                  selected={data.maintenanceType === 'conductive-cement'}
                  onPress={() =>
                    updateData(
                      {
                        maintenanceType: 'conductive-cement',
                        thorGelPhoto: null,
                      },
                      {
                        persistDraft: true,
                      },
                    )
                  }
                />
              </View>
            </View>

            {/* 3a. Thor Gel (solo convencional) */}
            {data.maintenanceType === 'conventional' && (
              <View style={styles.card}>
                <View style={styles.labelRow}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name="flash-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.labelSmall}>Aplicación de Thor Gel</Text>
                </View>
                <PhotoButton
                  onPress={() => takePhoto('thorGel')}
                  hasPhoto={!!data.thorGelPhoto}
                />
                {data.thorGelPhoto && (
                  <PhotoThumbnail uri={data.thorGelPhoto} />
                )}
              </View>
            )}

            {/* 4. Medición Post */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="gauge"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.labelSmall}>
                  Medición con Telurómetro{' '}
                  <Text style={styles.labelMuted}>(Después del Mantto)</Text>
                </Text>
              </View>
              <View style={styles.measurementRow}>
                <TextInput
                  style={styles.measurementInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={data.postMeasurement}
                  onChangeText={text => updateData({ postMeasurement: text })}
                  onBlur={persistCurrentDraft}
                  keyboardType="numeric"
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>Ω</Text>
                </View>
              </View>
              <PhotoButton
                onPress={() => takePhoto('postMeasurement')}
                hasPhoto={!!data.postMeasurementPhoto}
              />
              {data.postMeasurementPhoto && (
                <PhotoThumbnail uri={data.postMeasurementPhoto} />
              )}
            </View>

            {/* 5. Observación General */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name="text-box-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.labelSmall}>
                  Observación General{' '}
                  <Text style={styles.labelMuted}>(opcional)</Text>
                </Text>
              </View>
              <TextInput
                style={[styles.obsInput, { minHeight: 70 }]}
                placeholder="Descripción u observación..."
                placeholderTextColor={COLORS.textMuted}
                value={data.generalObservation}
                onChangeText={text => updateData({ generalObservation: text })}
                onBlur={persistCurrentDraft}
                maxLength={MAX_GENERAL_OBSERVATION_LENGTH}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* ═══ SECCIÓN: Inspección del Pozo ═══ */}
            <Text style={styles.sectionTitle}>Inspección del Pozo</Text>

            {/* Estado de la Tapa */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.labelRow}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name="layers-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.labelSmall}>Estado de la Tapa</Text>
                </View>
                <View style={styles.statusContainer}>
                  <Text
                    style={[
                      styles.statusBadge,
                      data.lidStatus === 'good'
                        ? styles.statusBadgeOk
                        : styles.statusBadgeBad,
                    ]}>
                    {data.lidStatus === 'good' ? 'OK' : 'OBS'}
                  </Text>
                  <Switch
                    value={data.lidStatus === 'good'}
                    onValueChange={value =>
                      updateData(
                        {
                          lidStatus: value ? 'good' : 'bad',
                          lidStatusObservation: value
                            ? LID_STATUS_TEXT.good
                            : LID_STATUS_TEXT.bad,
                          lidStatusPhoto: value ? null : data.lidStatusPhoto,
                        },
                        { persistDraft: true },
                      )
                    }
                    trackColor={{ false: '#E5E7EB', true: COLORS.primarySoft }}
                    thumbColor={
                      data.lidStatus === 'good' ? COLORS.primary : '#D1D5DB'
                    }
                    style={styles.switchSmall}
                  />
                </View>
              </View>
              {data.lidStatus === 'bad' && (
                <View style={styles.statusDescriptionBox}>
                  <Text style={styles.statusDescriptionLabel}>Estado</Text>
                  <Text style={styles.statusDescription}>
                    {LID_STATUS_TEXT.bad}
                  </Text>
                </View>
              )}
              {data.lidStatus === 'bad' && (
                <>
                  <PhotoButton
                    onPress={() => takePhoto('lidStatus')}
                    hasPhoto={!!data.lidStatusPhoto}
                    compact
                  />
                  <Text style={styles.optionalHint}>Foto opcional</Text>
                  {data.lidStatusPhoto && (
                    <PhotoThumbnail uri={data.lidStatusPhoto} />
                  )}
                </>
              )}
            </View>

            {renderToggleItem('Medición del Pozo', 'wellMeasurement', 'gauge')}
            {renderToggleItem('Señalética en Pared', 'hasSignage', 'numeric')}
            {renderToggleItem(
              'Rotulado del Pozo',
              'wellLabeling',
              'tag-outline',
            )}
            {renderToggleItem(
              'Estado del Conductor (Cable)',
              'connectorsOk',
              'power-plug',
            )}
            {renderToggleItem('Cuenta con Acceso', 'hasAccess', 'door-open')}

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

      <View style={styles.syncStatusWrap}>
        <View
          style={[
            styles.syncStatusDot,
            saveStatus === 'sincronizado' && styles.syncStatusDotSynced,
            saveStatus === 'sincronizando' && styles.syncStatusDotSyncing,
            saveStatus === 'error-sync' && styles.syncStatusDotError,
            saveStatus === 'pendiente-local' && styles.syncStatusDotPending,
            saveStatus === 'guardado-local' && styles.syncStatusDotLocal,
          ]}
        />
        <Text style={styles.syncStatusText}>{statusMessage}</Text>
        {(saveStatus === 'error-sync' || saveStatus === 'guardado-local') && (
          <Pressable
            style={({ pressed }) => [
              styles.syncRetryButton,
              pressed && styles.pressed,
            ]}
            onPress={handleManualRetrySync}
            accessibilityRole="button">
            <Ionicons name="sync-outline" size={14} color="#0E7490" />
            <Text style={styles.syncRetryButtonText}>Reintentar ahora</Text>
          </Pressable>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={styles.continueBtn}
          onPress={handleContinue}
          accessibilityRole="button">
          <Text style={styles.continueBtnText}>
            {data.executionStatus === 'reprogrammed'
              ? 'Reprogramar y Finalizar'
              : 'Guardar y Continuar'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#fff"
            style={styles.continueIcon}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Content
  content: { flex: 1, backgroundColor: COLORS.bg },
  contentContainer: { padding: 14 },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
    marginLeft: 2,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Labels
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 6,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  labelSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  labelMuted: {
    fontWeight: '400',
    color: COLORS.textMuted,
    fontSize: 12,
  },

  // Status badge
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statusBadgeOk: {
    backgroundColor: '#ECFDF5',
    color: COLORS.success,
  },
  statusBadgeBad: {
    backgroundColor: '#FEF2F2',
    color: COLORS.error,
  },
  switchSmall: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // Measurement
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  measurementInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.borderLight,
  },
  unitBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  unitBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Type selector
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.borderLight,
  },
  typeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  typeButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Instrument selector
  instrumentLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  instrumentHelperText: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  instrumentList: {
    gap: 8,
  },
  instrumentCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 10,
  },
  instrumentCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  instrumentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  instrumentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  instrumentTitleSelected: {
    color: COLORS.primary,
  },
  instrumentMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Photo button (soft outline style)
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    backgroundColor: COLORS.primaryLight,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  photoButtonCompact: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  photoButtonTextCompact: {
    fontSize: 12,
  },
  photoOrientationHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.primarySoft,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  photoOrientationHintText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Observation
  obsInput: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: COLORS.borderLight,
  },
  reprogramHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  statusDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  statusDescriptionBox: {
    marginTop: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusDescriptionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  optionalHint: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  bottomSpacer: {
    height: 30,
  },

  // Thumbnail
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },

  // Sync status
  syncStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: COLORS.white,
  },
  syncStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.textMuted,
    marginRight: 8,
  },
  syncStatusDotSynced: {
    backgroundColor: COLORS.success,
  },
  syncStatusDotSyncing: {
    backgroundColor: COLORS.accent,
  },
  syncStatusDotError: {
    backgroundColor: COLORS.error,
  },
  syncStatusDotPending: {
    backgroundColor: '#F59E0B',
  },
  syncStatusDotLocal: {
    backgroundColor: COLORS.primary,
  },
  syncStatusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  syncRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#67E8F9',
    backgroundColor: '#ECFEFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 8,
  },
  syncRetryButtonText: {
    fontSize: 12,
    color: '#0E7490',
    fontWeight: '700',
  },

  // Footer
  footer: {
    padding: 14,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  continueBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  continueIcon: {
    marginLeft: 6,
  },
  pressed: {
    opacity: 0.84,
  },
});
