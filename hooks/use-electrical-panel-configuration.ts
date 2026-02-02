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
// import { supabaseElectricalPanelService } from '@/services/supabase-electrical-panel.service';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

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

const DEFAULT_CIRCUIT: any = {
  phaseITM: 'mono_2w',
  amperajeITM: '',
  diameter: '',
  cableType: 'libre_halogeno',
  hasID: false,
  diameterID: '',
  cableTypeID: undefined, // This one is optional in schema, so undefined is okay
  supply: '',
};

// ============================================================================
// HOOK
// ============================================================================

export interface UsePanelConfigurationReturn {
  currentStepId: StepId;
  form: UseFormReturn<any>; // Changed to any to bypass library version/type conflicts
  goNext: () => Promise<void>;
  goBack: () => void;
}

export function usePanelConfiguration(
  initialPanel: PanelData | null,
): UsePanelConfigurationReturn {
  const router = useRouter();
  const [currentStepId, setCurrentStepId] = useState<StepId>(STEP_ORDER[0]);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

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
    mode: 'onChange',
  });

  const { trigger, getValues, reset, watch } = form;

  // Debounce ref for auto-save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          console.log('📂 [CONFIG] Loaded draft for panel:', initialPanel?.id);

          // Restore form values
          if (parsed.formValues) {
            reset(parsed.formValues);
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
        console.error('❌ [CONFIG] Error loading draft:', error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [getStorageKey, initialPanel?.id, reset]);

  // Auto-save draft when form values change (with debounce)
  useEffect(() => {
    const subscription = watch(formValues => {
      // Don't save while loading
      if (isLoadingDraft) return;

      const storageKey = getStorageKey();
      if (!storageKey) return;

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save by 1.5 seconds
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const draft = {
            formValues,
            currentStepId,
            lastUpdated: new Date().toISOString(),
          };
          await AsyncStorage.setItem(storageKey, JSON.stringify(draft));
          console.log('💾 [CONFIG] Draft saved for panel:', initialPanel?.id);
        } catch (error) {
          console.error('❌ [CONFIG] Error saving draft:', error);
        }
      }, 1500);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watch, getStorageKey, currentStepId, isLoadingDraft, initialPanel?.id]);

  // Save step changes
  useEffect(() => {
    const saveStepChange = async () => {
      if (isLoadingDraft) return;

      const storageKey = getStorageKey();
      if (!storageKey) return;

      try {
        const existingDraft = await AsyncStorage.getItem(storageKey);
        if (existingDraft) {
          const parsed = JSON.parse(existingDraft);
          parsed.currentStepId = currentStepId;
          parsed.lastUpdated = new Date().toISOString();
          await AsyncStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      } catch (error) {
        console.error('❌ [CONFIG] Error saving step change:', error);
      }
    };

    saveStepChange();
  }, [currentStepId, getStorageKey, isLoadingDraft]);

  // Function to clear draft after successful save
  const clearDraft = useCallback(async () => {
    const storageKey = getStorageKey();
    if (storageKey) {
      try {
        await AsyncStorage.removeItem(storageKey);
        console.log('🗑️ [CONFIG] Draft cleared for panel:', initialPanel?.id);
      } catch (error) {
        console.error('❌ [CONFIG] Error clearing draft:', error);
      }
    }
  }, [getStorageKey, initialPanel?.id]);

  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof PanelConfigurationFormValues)[] = [];

    switch (currentStepId) {
      case STEP_IDS.BASIC_INFO:
        fieldsToValidate = ['panelType', 'voltage', 'phase'];
        break;
      case STEP_IDS.ITG_CONFIG:
        fieldsToValidate = ['itgCount', 'itgDescriptions'];
        break;
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

    const result = await trigger(fieldsToValidate);

    // Manual check for errors to show alert if needed (mimicking previous behavior)
    if (!result) {
      // Optional: you could inspect form.formState.errors here to show specific alerts
      // But usually the UI will show the validation errors under the fields
      // Alert.alert("Validación", "Por favor revise los campos marcados en rojo.");
    }

    return result;
  };

  const goNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    const currentIndex = getStepIndex(currentStepId);
    if (isLastStep(currentStepId)) {
      try {
        console.log('🔵 [SAVE] Starting panel configuration save...');
        const values = getValues();
        console.log('🔵 [SAVE] Form values:', JSON.stringify(values, null, 2));

        // Helper labels
        const PHASE_LABELS: Record<string, string> = {
          mono_2w: 'Monofásico 2 hilos',
          tri_3w: 'Trifásico 3 hilos',
          tri_4w: 'Trifásico 4 hilos',
        };

        const CABLE_TYPE_LABELS: Record<string, string> = {
          libre_halogeno: 'Libre de Halógeno',
          no_libre_halogeno: 'No Libre de Halógeno',
        };

        // Map form values to the requested JSONB structure
        const newDetailMapping = {
          rotulo: initialPanel?.name || initialPanel?.codigo || 'Tablero',
          detalle_tecnico: {
            fases: PHASE_LABELS[values.phase] || values.phase,
            voltaje: Number(values.voltage),
            tipo_tablero: values.panelType.toUpperCase(),
          },
          itgs: values.itgCircuits.map((itg, idx) => ({
            id: `ITG-${idx + 1}`,
            suministra: values.itgDescriptions[idx] || 'N/A',
            prefijo: itg.cnPrefix,
            itms: itg.circuits.map((circuit, cIdx) => ({
              id: `${itg.cnPrefix}-${cIdx + 1}`,
              fases: PHASE_LABELS[circuit.phaseITM] || circuit.phaseITM,
              amperaje: Number(circuit.amperajeITM),
              tipo_cable: circuit.cableType
                ? CABLE_TYPE_LABELS[circuit.cableType] || circuit.cableType
                : undefined,
              diametro_cable: circuit.diameter,
              diferencial: {
                existe: circuit.hasID,
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

        console.log(
          '🔵 [SAVE] Mapped detail structure:',
          JSON.stringify(newDetailMapping, null, 2),
        );

        if (initialPanel?.id) {
          console.log('🔵 [SAVE] Panel ID found:', initialPanel.id);
          // 1. Fetch current equipment_detail to avoid losing fields (merge)
          // For offline support, we should merge with what we have locally or just overwrite if critical.
          // Since we are moving to offline-first, relying on `initialPanel` which comes from local DB should be safer.
          // If we want to be 100% sure we merge with existing local data:
          // const existingPanelLocal =
          //   (await DatabaseService.getElectricalPanelsByProperty(
          //     initialPanel.id_property!, // we need property ID here
          //   )) as any[];
          // Actually, we can just assume initialPanel content is relatively fresh or simplistic merge.

          // Better approach: Just use initialPanel.equipment_detail if connected components passed it correctly.
          const currentDetail = initialPanel.equipment_detail || {};

          // 2. Merge existing data with new mapping
          const finalEquipmentDetail = {
            ...currentDetail,
            ...newDetailMapping,
          };

          await DatabaseService.saveOfflinePanelConfiguration(
            initialPanel.id,
            finalEquipmentDetail,
          );

          // Trigger background sync if possible, or let the periodic/auto sync handle it.
          syncService.pushData().catch(err => {
            console.log(
              '⚠️ [SAVE] Background sync trigger failed (expected if offline):',
              err,
            );
          });

          // Clear the draft after successful save
          await clearDraft();

          Alert.alert(
            'Configuración guardada',
            'El equipo ha sido configurado localmente y se sincronizará cuando haya conexión.',
            [{ text: 'OK', onPress: () => router.back() }],
          );
        } else {
          console.log(
            '❌ [SAVE] No panel ID found! initialPanel:',
            initialPanel,
          );
          throw new Error('ID de panel no encontrado');
        }
      } catch (error) {
        console.error('❌ [SAVE] Error saving panel configuration:', error);
        Alert.alert(
          'Error',
          'No se pudo guardar la configuración. Por favor reintente.',
        );
      }
      return;
    }
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStepId(STEP_ORDER[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const currentIndex = getStepIndex(currentStepId);
    if (currentIndex > 0) {
      setCurrentStepId(STEP_ORDER[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  return {
    currentStepId,
    form,
    goNext,
    goBack,
  };
}
