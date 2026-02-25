import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PanelData } from '@/types/panel-configuration';
import {
  PanelConfigurationSchema,
  PanelConfigurationFormValues,
} from '@/schemas/panel-configuration';
import { DatabaseService } from '@/services/database';
import { syncQueue } from '@/services/sync-queue';
import { supabaseElectricalPanelService } from '@/services/supabase-electrical-panel.service';

// Storage key prefix for configuration drafts
const CONFIG_DRAFT_KEY_PREFIX = 'panel_config_draft_';

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

export const STEP_IDS = {
  BASIC_INFO: 'basic-info',
  ITG_CONFIG: 'itg-config',
  CIRCUITS: 'circuits',
  EXTRA_COMPONENTS: 'extra-components',
  EXTRA_CONDITIONS: 'extra-conditions',
  REVIEW: 'review',
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

export const STEP_ORDER: StepId[] = [
  STEP_IDS.BASIC_INFO,
  STEP_IDS.ITG_CONFIG,
  STEP_IDS.CIRCUITS,
  STEP_IDS.EXTRA_COMPONENTS,
  STEP_IDS.EXTRA_CONDITIONS,
  STEP_IDS.REVIEW,
];

export function getStepIndex(stepId: StepId): number {
  return STEP_ORDER.indexOf(stepId);
}

export function isLastStep(stepId: StepId): boolean {
  return getStepIndex(stepId) === STEP_ORDER.length - 1;
}

export function isFirstStep(stepId: StepId): boolean {
  return getStepIndex(stepId) === 0;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_CIRCUIT: PanelConfigurationFormValues['itgCircuits'][number]['circuits'][number] =
  {
    interruptorType: 'itm',
    phase: 'mono_2w',
    amperaje: '',
    diameter: '',
    cableType: 'libre_halogeno',
    supply: '',
    hasID: false,
    phaseID: undefined,
    amperajeID: '',
    diameterID: '',
    cableTypeID: undefined,
    subITMsCount: '1',
    subITMs: [],
  };

// Helper labels — defined once at module level to avoid re-creation on each save
const PHASE_LABELS: Record<string, string> = {
  unipolar: 'Unipolar',
  mono_2w: 'Monofásico 2 hilos',
  tri_3w: 'Trifásico 3 hilos',
  tri_4w: 'Trifásico 4 hilos',
};

const CABLE_TYPE_LABELS: Record<string, string> = {
  libre_halogeno: 'Libre de Halógeno',
  no_libre_halogeno: 'No Libre de Halógeno',
};

// ============================================================================
// HOOK
// ============================================================================

export interface UsePanelConfigurationReturn {
  currentStepId: StepId;
  form: UseFormReturn<PanelConfigurationFormValues>;
  goNext: () => Promise<void>;
  goBack: () => void;
  saveDraft: () => Promise<void>;
}

export function usePanelConfiguration(
  initialPanel: PanelData | null,
  isEditMode: boolean = false,
): UsePanelConfigurationReturn {
  const router = useRouter();
  const [currentStepId, setCurrentStepId] = useState<StepId>(STEP_ORDER[0]);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  // Refs to hold latest values without causing re-renders or stale closures
  const currentStepIdRef = useRef(currentStepId);
  currentStepIdRef.current = currentStepId;

  const isLoadingDraftRef = useRef(isLoadingDraft);
  isLoadingDraftRef.current = isLoadingDraft;

  // Generate storage key based on panel ID
  const getStorageKey = useCallback(() => {
    if (!initialPanel?.id) return null;
    return `${CONFIG_DRAFT_KEY_PREFIX}${initialPanel.id}`;
  }, [initialPanel?.id]);

  const form = useForm<PanelConfigurationFormValues>({
    resolver: zodResolver(PanelConfigurationSchema),
    defaultValues: {
      panelType: 'adosado',
      voltage: '220',
      phase: 'mono_2w',
      itgCount: '1',
      itgDescriptions: [''],
      itgCircuits: [
        {
          cnPrefix: 'CN',
          circuitsCount: '1',
          circuits: [{ ...DEFAULT_CIRCUIT }],
          amperajeITG: '',
          diameterITG: '',
          cableTypeITG: 'libre_halogeno',
        },
      ],
      enabledComponents: [],
      extraComponents: {
        contactores: [],
        relays: [],
        ventiladores: [],
        termostato: [],
        medidores: [],
        timers: [],
      },
      extraConditions: {
        mandilProteccion: false,
        puertaMandilAterrados: false,
        barraTierra: false,
        terminalesElectricos: false,
        mangasTermoContraibles: false,
        diagramaUnifilarDirectorio: false,
      },
    },
    // 'onBlur' prevents full Zod schema validation on every keystroke.
    // With 'onChange', each character typed runs the entire PanelConfigurationSchema
    // (including nested arrays with superRefine), causing significant lag.
    // Step-level validation is handled explicitly in validateCurrentStep().
    mode: 'onBlur',
  });

  const { trigger, getValues, reset } = form;

  // ── Draft Persistence ────────────────────────────────────────────────────

  // Save draft explicitly — called on step transitions and unmount.
  // Replaces the old `watch()` global subscription which listened to every
  // field change and caused unnecessary overhead (each keystroke triggered the
  // subscription callback even with debounce).
  const saveDraft = useCallback(async () => {
    if (isLoadingDraftRef.current) return;
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const draft = {
        formValues: getValues(),
        currentStepId: currentStepIdRef.current,
        lastUpdated: new Date().toISOString(),
      };
      let serialized: string;
      try {
        serialized = JSON.stringify(draft);
      } catch {
        if (__DEV__)
          console.warn('[CONFIG] Draft too large to serialize, skipping save');
        return;
      }
      await AsyncStorage.setItem(storageKey, serialized);
      if (__DEV__)
        console.log('[CONFIG] Draft saved for panel:', initialPanel?.id);
    } catch (error) {
      if (__DEV__) console.error('[CONFIG] Error saving draft:', error);
    }
  }, [getStorageKey, getValues, initialPanel?.id]);

  // Load saved draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const storageKey = getStorageKey();
      if (!storageKey) {
        setIsLoadingDraft(false);
        return;
      }

      try {
        const savedDraft = await AsyncStorage.getItem(storageKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (__DEV__)
            console.log('[CONFIG] Loaded draft for panel:', initialPanel?.id);

          // Restore form values — validate against schema first to prevent
          // crashes from stale/mismatched draft data (e.g. after schema changes
          // between app updates).
          if (parsed.formValues) {
            const validation = PanelConfigurationSchema.safeParse(
              parsed.formValues,
            );
            if (validation.success) {
              reset(parsed.formValues);
            } else {
              if (__DEV__)
                console.warn(
                  '[CONFIG] Draft schema mismatch, discarding stale draft',
                );
              await AsyncStorage.removeItem(storageKey);
            }
          }

          // Restore current step
          if (
            parsed.currentStepId &&
            STEP_ORDER.includes(parsed.currentStepId)
          ) {
            setCurrentStepId(parsed.currentStepId);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('[CONFIG] Error loading draft:', error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [getStorageKey, initialPanel?.id, reset]);

  // Save draft on unmount so user doesn't lose data if they navigate away
  useEffect(() => {
    return () => {
      saveDraft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to clear draft after successful save
  const clearDraft = useCallback(async () => {
    const storageKey = getStorageKey();
    if (storageKey) {
      try {
        await AsyncStorage.removeItem(storageKey);
        if (__DEV__)
          console.log('[CONFIG] Draft cleared for panel:', initialPanel?.id);
      } catch (error) {
        if (__DEV__) console.error('[CONFIG] Error clearing draft:', error);
      }
    }
  }, [getStorageKey, initialPanel?.id]);

  // ── Validation ───────────────────────────────────────────────────────────

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    let fieldsToValidate: (keyof PanelConfigurationFormValues)[] = [];

    switch (currentStepId) {
      case STEP_IDS.BASIC_INFO:
        fieldsToValidate = ['panelType', 'voltage', 'phase'];
        break;
      case STEP_IDS.ITG_CONFIG: {
        // First validate basic fields
        const basicResult = await trigger(['itgCount', 'itgDescriptions']);
        if (!basicResult) return false;

        // Manual validation for IT-G specific fields (amperaje, diameter, cableType)
        // We can't use trigger for itgCircuits because it would also validate circuits inside
        const itgCircuits = getValues('itgCircuits');
        let hasErrors = false;

        for (let i = 0; i < itgCircuits.length; i++) {
          const itg = itgCircuits[i];
          if (!itg.amperajeITG || itg.amperajeITG.trim() === '') {
            form.setError(`itgCircuits.${i}.amperajeITG` as any, {
              type: 'manual',
              message: 'Amperaje es requerido',
            });
            hasErrors = true;
          }
          if (!itg.diameterITG || itg.diameterITG.trim() === '') {
            form.setError(`itgCircuits.${i}.diameterITG` as any, {
              type: 'manual',
              message: 'Diámetro es requerido',
            });
            hasErrors = true;
          }
          if (!itg.cableTypeITG) {
            form.setError(`itgCircuits.${i}.cableTypeITG` as any, {
              type: 'manual',
              message: 'Seleccione tipo de cable',
            });
            hasErrors = true;
          }
        }

        return !hasErrors;
      }
      case STEP_IDS.CIRCUITS:
        fieldsToValidate = ['itgCircuits'];
        break;
      case STEP_IDS.EXTRA_COMPONENTS:
        fieldsToValidate = ['enabledComponents', 'extraComponents'];
        break;
      case STEP_IDS.EXTRA_CONDITIONS:
        fieldsToValidate = ['extraConditions'];
        break;
      case STEP_IDS.REVIEW:
        return true;
    }

    return trigger(fieldsToValidate);
  }, [currentStepId, trigger, getValues, form]);

  // ── Navigation ───────────────────────────────────────────────────────────

  const goNext = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    const currentIndex = getStepIndex(currentStepId);
    if (isLastStep(currentStepId)) {
      try {
        if (__DEV__) console.log('[SAVE] Starting panel configuration save...');
        const values = getValues();
        if (__DEV__) {
          console.log('[SAVE] Form values:', JSON.stringify(values, null, 2));
        }

        // Map form values to the requested JSONB structure
        const newDetailMapping = {
          rotulo:
            initialPanel?.equipment_detail?.rotulo ||
            initialPanel?.codigo ||
            'Tablero',
          detalle_tecnico: {
            fases: PHASE_LABELS[values.phase] || values.phase,
            voltaje: Number(values.voltage),
            tipo_tablero: values.panelType.toUpperCase(),
          },
          itgs: values.itgCircuits.map((itg, idx) => ({
            id: `ITG-${idx + 1}`,
            suministra: values.itgDescriptions[idx] || 'N/A',
            prefijo: itg.cnPrefix,
            amperaje: itg.amperajeITG ? Number(itg.amperajeITG) : undefined,
            diametro_cable: itg.diameterITG || undefined,
            tipo_cable: itg.cableTypeITG
              ? CABLE_TYPE_LABELS[itg.cableTypeITG] || itg.cableTypeITG
              : undefined,
            itms: itg.circuits.map((circuit, cIdx) => ({
              id: `${itg.cnPrefix}-${cIdx + 1}`,
              tipo:
                circuit.interruptorType === 'id'
                  ? 'ID'
                  : circuit.interruptorType === 'reserva'
                    ? 'Reserva'
                    : 'ITM',
              fases: circuit.phase
                ? PHASE_LABELS[circuit.phase] || circuit.phase
                : '',
              amperaje: circuit.amperaje ? Number(circuit.amperaje) : 0,
              tipo_cable: circuit.cableType
                ? CABLE_TYPE_LABELS[circuit.cableType] || circuit.cableType
                : undefined,
              diametro_cable: circuit.diameter || '',
              ...(circuit.interruptorType === 'itm' && {
                diferencial: {
                  existe: !!circuit.hasID,
                  ...(circuit.hasID && {
                    fases: circuit.phaseID
                      ? PHASE_LABELS[circuit.phaseID] || circuit.phaseID
                      : undefined,
                    amperaje: circuit.amperajeID
                      ? Number(circuit.amperajeID)
                      : undefined,
                    tipo_cable: circuit.cableTypeID
                      ? CABLE_TYPE_LABELS[circuit.cableTypeID] ||
                        circuit.cableTypeID
                      : undefined,
                    diametro_cable: circuit.diameterID,
                  }),
                },
              }),
              ...(circuit.interruptorType === 'id' &&
                circuit.subITMs && {
                  sub_itms: circuit.subITMs.map((subItm, sIdx) => ({
                    id: `${itg.cnPrefix}-${cIdx + 1}-${sIdx + 1}`,
                    fases: PHASE_LABELS[subItm.phaseITM] || subItm.phaseITM,
                    amperaje: Number(subItm.amperajeITM),
                    tipo_cable: subItm.cableType
                      ? CABLE_TYPE_LABELS[subItm.cableType] || subItm.cableType
                      : undefined,
                    diametro_cable: subItm.diameter,
                    suministra: subItm.supply || 'N/A',
                  })),
                }),
              suministra: circuit.supply || 'N/A',
            })),
          })),
          componentes: [
            {
              tipo: 'RELAY',
              items: values.extraComponents.relays.map(r => ({
                codigo: r.id,
                suministra: r.description,
              })),
            },
            {
              tipo: 'CONTACTOR',
              items: values.extraComponents.contactores.map(c => ({
                codigo: c.id,
                suministra: c.description,
              })),
            },
            {
              tipo: 'TIMER',
              items: values.extraComponents.timers.map(t => ({
                codigo: t.id,
                suministra: t.description,
              })),
            },
            {
              tipo: 'MEDIDOR',
              items: values.extraComponents.medidores.map(m => ({
                codigo: m.id,
                suministra: m.description,
              })),
            },
            {
              tipo: 'TERMOSTATO',
              items: values.extraComponents.termostato.map(t => ({
                codigo: t.id,
                suministra: t.description,
              })),
            },
            {
              tipo: 'VENTILADOR',
              items: values.extraComponents.ventiladores.map(v => ({
                codigo: v.id,
                suministra: v.description,
              })),
            },
          ].filter(group => group.items.length > 0),
          condiciones_especiales: {
            barra_tierra: values.extraConditions.barraTierra,
            mandil_proteccion: values.extraConditions.mandilProteccion,
            terminal_electrico: values.extraConditions.terminalesElectricos,
            puerta_mandil_aterrados:
              values.extraConditions.puertaMandilAterrados,
            mangas_termo_contraibles:
              values.extraConditions.mangasTermoContraibles,
            diagrama_unifilar_directorio:
              values.extraConditions.diagramaUnifilarDirectorio,
          },
        };

        if (__DEV__) {
          console.log(
            '[SAVE] Mapped detail structure:',
            JSON.stringify(newDetailMapping, null, 2),
          );
        }

        if (initialPanel?.id) {
          if (__DEV__) console.log('[SAVE] Panel ID found:', initialPanel.id);

          const currentDetail = initialPanel.equipment_detail || {};

          // Merge existing data with new mapping
          const finalEquipmentDetail = {
            ...currentDetail,
            ...newDetailMapping,
          };

          if (isEditMode) {
            if (__DEV__)
              console.log('[SAVE] Edit Mode: Saving directly to Supabase...');

            // Save directly to Supabase bypassing local offline sync
            await supabaseElectricalPanelService.updateEquipmentDetail(
              initialPanel.id,
              finalEquipmentDetail,
            );

            // Also update local DB for immediate UI feedback without queuing
            await DatabaseService.saveOfflinePanelConfiguration(
              initialPanel.id,
              finalEquipmentDetail,
            );

            if (__DEV__) console.log('[SAVE] Direct Supabase save completed');
          } else {
            if (__DEV__) console.log('[SAVE] Normal Mode: Queuing for sync...');

            await DatabaseService.saveOfflinePanelConfiguration(
              initialPanel.id,
              finalEquipmentDetail,
            );

            // Add to sync queue for automatic retry with exponential backoff
            syncQueue.enqueue(initialPanel.id, 'panel_config');
            if (__DEV__)
              console.log('[SAVE] Added to sync queue:', initialPanel.id);
          }

          // Clear the draft after successful save
          await clearDraft();

          Alert.alert(
            'Configuración guardada',
            isEditMode
              ? 'El equipo ha sido actualizado en la nube exitosamente.'
              : 'El equipo ha sido configurado localmente y se sincronizará cuando haya conexión.',
            [{ text: 'OK', onPress: () => router.back() }],
          );
        } else {
          if (__DEV__)
            console.log(
              '[SAVE] No panel ID found! initialPanel:',
              initialPanel,
            );
          throw new Error('ID de panel no encontrado');
        }
      } catch (error) {
        if (__DEV__)
          console.error('[SAVE] Error saving panel configuration:', error);
        Alert.alert(
          'Error',
          'No se pudo guardar la configuración. Por favor reintente.',
        );
      }
      return;
    }

    // Save draft before transitioning to the next step
    await saveDraft();

    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStepId(STEP_ORDER[currentIndex + 1]);
    }
  }, [
    validateCurrentStep,
    currentStepId,
    getValues,
    initialPanel,
    isEditMode,
    clearDraft,
    saveDraft,
    router,
  ]);

  const goBack = useCallback(() => {
    // Fire-and-forget draft save before navigating back
    saveDraft();

    const currentIndex = getStepIndex(currentStepId);
    if (currentIndex > 0) {
      setCurrentStepId(STEP_ORDER[currentIndex - 1]);
    } else {
      router.back();
    }
  }, [currentStepId, saveDraft, router]);

  return {
    currentStepId,
    form,
    goNext,
    goBack,
    saveDraft,
  };
}
