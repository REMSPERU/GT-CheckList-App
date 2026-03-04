import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { PanelData } from '@/types/panel-configuration';
import {
  PanelConfigurationSchema,
  PanelConfigurationFormValues,
  PanelConfigurationDraftSchema,
  DEFAULT_CIRCUIT,
} from '@/schemas/panel-configuration';
import { DatabaseService } from '@/services/database';
import { syncQueue } from '@/services/sync-queue';
import { supabaseElectricalPanelService } from '@/services/supabase-electrical-panel.service';

// Storage key prefix for configuration drafts
const CONFIG_DRAFT_KEY_PREFIX = 'panel_config_draft_';

// Auto-save interval in milliseconds.
// 10 seconds is long enough that even with 50 circuits the periodic
// JSON.stringify + AsyncStorage write won't stack up on the JS thread,
// but short enough that the user loses at most ~10 s of work on a crash.
const AUTO_SAVE_INTERVAL_MS = 10_000;

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
          phaseITG: 'mono_2w',
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
    // 'onSubmit' prevents the Zod resolver from running automatically on blur
    // or change. With 'onBlur', every blur event runs the full
    // PanelConfigurationSchema (including superRefine over all 30+ circuits),
    // causing a noticeable freeze. All validation is handled explicitly:
    // - Per-step via validateCurrentStep()
    // - Per-ITG via validateCurrentItg() in CircuitsConfigStep
    // - Final submit via the last step's goNext()
    mode: 'onSubmit',
  });

  const { trigger, getValues, reset } = form;

  // ── Draft Persistence ────────────────────────────────────────────────────

  // Save draft explicitly — called on step transitions, unmount, background,
  // and periodically via auto-save.
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

  // ── Auto-save: periodic interval ──────────────────────────────────────────
  // Saves every AUTO_SAVE_INTERVAL_MS unconditionally. The cost per tick is
  // one JSON.stringify + one AsyncStorage.setItem — negligible compared to
  // the old form.watch() approach which deep-cloned the entire form values
  // tree (300+ fields with 30 circuits) on *every single keystroke*.
  const saveDraftRef = useRef(saveDraft);
  saveDraftRef.current = saveDraft;

  useEffect(() => {
    const interval = setInterval(() => {
      saveDraftRef.current();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Sentry form-size telemetry ────────────────────────────────────────────
  // Every 30 s, snapshot the form dimensions so Sentry events that happen near
  // OOM kills include the latest circuit/ITG counts. Cheap: one getValues()
  // call + two array-length reads.
  const SENTRY_CONTEXT_INTERVAL_MS = 30_000;

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const vals = getValues();
        const itgCircuits = vals.itgCircuits ?? [];
        const totalCircuits = itgCircuits.reduce(
          (sum, itg) => sum + (itg.circuits?.length ?? 0),
          0,
        );
        const totalSubITMs = itgCircuits.reduce(
          (sum, itg) =>
            sum +
            (itg.circuits ?? []).reduce(
              (s, c) => s + (c.subITMs?.length ?? 0),
              0,
            ),
          0,
        );

        Sentry.setContext('panel_form', {
          itgCount: itgCircuits.length,
          totalCircuits,
          totalSubITMs,
          panelId: initialPanel?.id ?? 'unknown',
        });
      } catch {
        // getValues() can fail during unmount — ignore
      }
    }, SENTRY_CONTEXT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [getValues, initialPanel?.id]);

  // ── Save on app background (user switches app / OS kills) ────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      // 'background' on Android, 'inactive' on iOS (when the app is about
      // to go to background or the task switcher is shown).
      if (nextState === 'background' || nextState === 'inactive') {
        saveDraftRef.current();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

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

        // If in edit mode and no draft exists, or draft is very old,
        // we could hydrate from initialPanel.
        // For now, let's prioritize the draft if it exists.
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (__DEV__)
            console.log('[CONFIG] Loaded draft for panel:', initialPanel?.id);

          // Restore form values — validate against the DRAFT schema (lenient)
          // which only checks structure/types, not business rules.
          if (parsed.formValues) {
            const validation = PanelConfigurationDraftSchema.safeParse(
              parsed.formValues,
            );
            if (validation.success) {
              reset(parsed.formValues);
            } else {
              if (__DEV__)
                console.warn(
                  '[CONFIG] Draft schema mismatch, discarding stale draft',
                  validation.error.issues,
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
        } else if (isEditMode && initialPanel?.equipment_detail) {
          // Hydrate from existing panel data if no draft exists
          if (__DEV__)
            console.log(
              '[CONFIG] No draft found. Hydrating from initialPanel:',
              initialPanel.id,
            );

          const detail = initialPanel.equipment_detail;

          // Helper to reverse map labels to keys
          const reversePhaseMapping: Record<string, string> = Object.fromEntries(
            Object.entries(PHASE_LABELS).map(([k, v]) => [v, k]),
          );
          const reverseCableMapping: Record<string, string> = Object.fromEntries(
            Object.entries(CABLE_TYPE_LABELS).map(([k, v]) => [v, k]),
          );

          const getPhaseKey = (label?: string) =>
            label ? reversePhaseMapping[label] || label : 'mono_2w';
          const getCableKey = (label?: string) =>
            label ? reverseCableMapping[label] || label : 'libre_halogeno';

          const techDetail = detail.detalle_tecnico || {};

          // Map equipment_detail (Supabase/DB format) back to form values
          const hydratedValues: Partial<PanelConfigurationFormValues> = {
            panelType: (techDetail.tipo_tablero?.toLowerCase() ||
              'adosado') as any,
            voltage: techDetail.voltaje?.toString() || '220',
            phase: getPhaseKey(techDetail.fases) as any,
            itgCount: (detail.itgs?.length || 1).toString(),
            itgDescriptions: detail.itgs?.map((i: any) => i.suministra) || [''],
            itgCircuits:
              detail.itgs?.map((itg: any) => ({
                cnPrefix: itg.prefijo || 'CN',
                circuitsCount: (itg.itms?.length || 0).toString(),
                phaseITG: getPhaseKey(itg.fases),
                amperajeITG: itg.amperaje?.toString() || '',
                diameterITG: itg.diametro_cable || '',
                cableTypeITG: getCableKey(itg.tipo_cable),
                circuits:
                  itg.itms?.map((itm: any) => ({
                    interruptorType:
                      itm.tipo === 'ID'
                        ? 'id'
                        : itm.tipo === 'Reserva'
                          ? 'reserva'
                          : 'itm',
                    phase: getPhaseKey(itm.fases),
                    amperaje: itm.amperaje?.toString() || '',
                    diameter: itm.diametro_cable || '',
                    cableType: getCableKey(itm.tipo_cable),
                    supply: itm.suministra || '',
                    hasID: !!itm.diferencial?.existe,
                    phaseID: getPhaseKey(itm.diferencial?.fases),
                    amperajeID: itm.diferencial?.amperaje?.toString() || '',
                    diameterID: itm.diferencial?.diametro_cable || '',
                    cableTypeID: getCableKey(itm.diferencial?.tipo_cable),
                    hasSubITMs: !!(itm.sub_itms && itm.sub_itms.length > 0),
                    subITMsPrefix:
                      itm.sub_itms?.[0]?.id?.split('-')?.slice(0, -1)?.join('-') ||
                      'ITM',
                    subITMsCount: (itm.sub_itms?.length || 0).toString(),
                    subITMs: itm.sub_itms?.map((sub: any) => ({
                      name: sub.nombre || '',
                      phaseITM: getPhaseKey(sub.fases),
                      amperajeITM: sub.amperaje?.toString() || '',
                      diameter: sub.diametro_cable || '',
                      cableType: getCableKey(sub.tipo_cable),
                      supply: sub.suministra || '',
                      hasID: !!sub.diferencial?.existe,
                      phaseID: getPhaseKey(sub.diferencial?.fases),
                      amperajeID: sub.diferencial?.amperaje?.toString() || '',
                      diameterID: sub.diferencial?.diametro_cable || '',
                      cableTypeID: getCableKey(sub.diferencial?.tipo_cable),
                    })),
                  })) || [],
              })) || [],
            enabledComponents: detail.componentes?.map((c: any) =>
              c.tipo.toLowerCase().endsWith('s')
                ? c.tipo.toLowerCase()
                : `${c.tipo.toLowerCase()}s`,
            ) || [],
            extraComponents: {
              contactores:
                detail.componentes
                  ?.find((c: any) => c.tipo === 'CONTACTOR')
                  ?.items?.map((i: any) => ({
                    id: i.codigo,
                    description: i.suministra,
                  })) || [],
              relays:
                detail.componentes
                  ?.find((c: any) => c.tipo === 'RELAY')
                  ?.items?.map((i: any) => ({
                    id: i.codigo,
                    description: i.suministra,
                  })) || [],
              ventiladores:
                detail.componentes
                  ?.find((c: any) => c.tipo === 'VENTILADOR')
                  ?.items?.map((i: any) => ({
                    id: i.codigo,
                    description: i.suministra,
                  })) || [],
              termostato:
                detail.componentes
                  ?.find((c: any) => c.tipo === 'TERMOSTATO')
                  ?.items?.map((i: any) => ({
                    id: i.codigo,
                    description: i.suministra,
                  })) || [],
              medidores:
                detail.componentes
                  ?.find((c: any) => c.tipo === 'MEDIDOR')
                  ?.items?.map((i: any) => ({
                    id: i.codigo,
                    description: i.suministra,
                  })) || [],
              timers:
                detail.componentes
                  ?.find((c: any) => c.tipo === 'TIMER')
                  ?.items?.map((i: any) => ({
                    id: i.codigo,
                    description: i.suministra,
                  })) || [],
            },
            extraConditions: {
              mandilProteccion:
                !!detail.condiciones_especiales?.mandil_proteccion,
              puertaMandilAterrados:
                !!detail.condiciones_especiales?.puerta_mandil_aterrados,
              barraTierra: !!detail.condiciones_especiales?.barra_tierra,
              terminalesElectricos:
                !!detail.condiciones_especiales?.terminal_electrico,
              mangasTermoContraibles:
                !!detail.condiciones_especiales?.mangas_termo_contraibles,
              diagramaUnifilarDirectorio:
                !!detail.condiciones_especiales?.diagrama_unifilar_directorio,
            },
          };

          const validation =
            PanelConfigurationDraftSchema.safeParse(hydratedValues);
          if (validation.success) {
            reset(hydratedValues as PanelConfigurationFormValues);
          } else {
            if (__DEV__)
              console.warn(
                '[CONFIG] Hydration data schema mismatch',
                validation.error.issues,
              );
          }
        }
      } catch (error) {
        if (__DEV__) console.error('[CONFIG] Error loading draft:', error);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [getStorageKey, initialPanel, reset, isEditMode]);

  // Save draft on unmount so user doesn't lose data if they navigate away
  useEffect(() => {
    return () => {
      // Always flush on unmount regardless of dirty flag — the component
      // is being torn down, so we want to persist the latest state.
      saveDraftRef.current();
    };
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
          if (!itg.phaseITG) {
            form.setError(`itgCircuits.${i}.phaseITG` as any, {
              type: 'manual',
              message: 'Fase es requerida',
            });
            hasErrors = true;
          }
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
        // Validation for the circuits step is handled internally by
        // CircuitsConfigStep via its ref (handleNext validates each ITG
        // individually). By the time we reach goNext(), every ITG has
        // already passed validation. Re-triggering 'itgCircuits' here
        // would run the full Zod schema over ALL ITGs × circuits × subITMs
        // — potentially 1500+ objects — causing a noticeable freeze on
        // lower-end devices. Skip it.
        return true;
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
            fases: itg.phaseITG
              ? PHASE_LABELS[itg.phaseITG] || itg.phaseITG
              : undefined,
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
              ...((circuit.interruptorType === 'id' ||
                (circuit.interruptorType === 'itm' && circuit.hasSubITMs)) &&
                circuit.subITMs &&
                circuit.subITMs.length > 0 && {
                  sub_itms: circuit.subITMs.map((subItm, sIdx) => ({
                    id: `${itg.cnPrefix}-${cIdx + 1}-${sIdx + 1}`,
                    nombre:
                      subItm.name && subItm.name.trim() !== ''
                        ? subItm.name
                        : `${circuit.subITMsPrefix || 'ITM'} ${sIdx + 1}`,
                    fases: PHASE_LABELS[subItm.phaseITM] || subItm.phaseITM,
                    amperaje: Number(subItm.amperajeITM),
                    tipo_cable: subItm.cableType
                      ? CABLE_TYPE_LABELS[subItm.cableType] || subItm.cableType
                      : undefined,
                    diametro_cable: subItm.diameter,
                    suministra: subItm.supply || 'N/A',
                    // Diferencial del sub-ITM (solo para ITM padre)
                    ...(circuit.interruptorType === 'itm' && {
                      diferencial: {
                        existe: !!subItm.hasID,
                        ...(subItm.hasID && {
                          fases: subItm.phaseID
                            ? PHASE_LABELS[subItm.phaseID] || subItm.phaseID
                            : undefined,
                          amperaje: subItm.amperajeID
                            ? Number(subItm.amperajeID)
                            : undefined,
                          tipo_cable: subItm.cableTypeID
                            ? CABLE_TYPE_LABELS[subItm.cableTypeID] ||
                              subItm.cableTypeID
                            : undefined,
                          diametro_cable: subItm.diameterID,
                        }),
                      },
                    }),
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
