import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PanelData } from '@/types/panel-configuration';
import {
  PanelConfigurationSchema,
  PanelConfigurationFormValues,
} from '@/schemas/panel-configuration';
// import { supabaseElectricalPanelService } from '@/services/supabase-electrical-panel.service';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

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

  const { trigger, getValues } = form;



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
        const values = getValues();

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

        if (initialPanel?.id) {
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

          // SAVE LOCALLY (Offline First)
          await DatabaseService.saveOfflinePanelConfiguration(
            initialPanel.id,
            finalEquipmentDetail,
          );

          // Trigger background sync if possible, or let the periodic/auto sync handle it.
          syncService.pushData().catch(err => {
            console.log('Background sync trigger failed (expected if offline)');
          });

          Alert.alert(
            'Configuración guardada',
            'El equipo ha sido configurado localmente y se sincronizará cuando haya conexión.',
            [{ text: 'OK', onPress: () => router.back() }],
          );
        } else {
          throw new Error('ID de panel no encontrado');
        }
      } catch (error) {
        console.error('Error saving panel configuration:', error);
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
