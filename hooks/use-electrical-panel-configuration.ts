import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PanelData,
  CircuitConfig,
} from "@/types/panel-configuration";
import {
  PanelConfigurationSchema,
  PanelConfigurationFormValues,
} from "@/schemas/panel-configuration";
import { supabaseElectricalPanelService } from "@/services/supabase-electrical-panel.service";

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

const DEFAULT_CIRCUIT: CircuitConfig = {
  phaseITM: "mono_2w",
  amperajeITM: "",
  diameter: "",
  cableType: undefined,
  hasID: false,
  diameterID: "",
  cableTypeID: undefined,
  supply: "",
};

// ============================================================================
// HOOK
// ============================================================================

export interface UsePanelConfigurationReturn {
  currentStepId: StepId;
  form: UseFormReturn<PanelConfigurationFormValues>;
  goNext: () => Promise<void>;
  goBack: () => void;
}

export function usePanelConfiguration(initialPanel: PanelData | null): UsePanelConfigurationReturn {
  const router = useRouter();
  const [currentStepId, setCurrentStepId] = useState<StepId>(STEP_ORDER[0]);

  const form = useForm<PanelConfigurationFormValues>({
    resolver: zodResolver(PanelConfigurationSchema),
    defaultValues: {
      panelType: "adosado",
      voltage: "220",
      phase: "mono_2w",
      itgCount: "1",
      itgDescriptions: ["", "", ""],
      itgCircuits: [{
        cnPrefix: "CN",
        circuitsCount: "1",
        circuits: [{ ...DEFAULT_CIRCUIT }],
      }],
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
      }
    },
    mode: "onChange"
  });

  const { trigger, watch, setValue, getValues } = form;

  // Watchers for side effects (like updating array lengths based on counts)
  const itgCount = watch("itgCount");

  // Sync itgDescriptions and itgCircuits with itgCount
  useEffect(() => {
    const n = Math.max(0, parseInt(itgCount || "0", 10));
    const currentDescriptions = getValues("itgDescriptions");

    if (n !== currentDescriptions.length) {
      const nextDescriptions = [...currentDescriptions];
      if (n > nextDescriptions.length) {
        while (nextDescriptions.length < n) nextDescriptions.push("");
      } else {
        nextDescriptions.length = n;
      }
      setValue("itgDescriptions", nextDescriptions);

      // Sync circuits array
      const currentCircuits = getValues("itgCircuits");
      const nextCircuits = [...currentCircuits];
      if (n > nextCircuits.length) {
        while (nextCircuits.length < n) {
          nextCircuits.push({
            cnPrefix: "CN",
            circuitsCount: "1",
            circuits: [{ ...DEFAULT_CIRCUIT }],
          });
        }
      } else {
        nextCircuits.length = n;
      }
      setValue("itgCircuits", nextCircuits);
    }

  }, [itgCount, setValue, getValues]);


  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof PanelConfigurationFormValues)[] = [];

    switch (currentStepId) {
      case STEP_IDS.BASIC_INFO:
        fieldsToValidate = ["panelType", "voltage", "phase"];
        break;
      case STEP_IDS.ITG_CONFIG:
        fieldsToValidate = ["itgCount", "itgDescriptions"];
        break;
      case STEP_IDS.CIRCUITS:
        fieldsToValidate = ["itgCircuits"];
        break;
      case STEP_IDS.EXTRA_COMPONENTS:
        fieldsToValidate = ["enabledComponents", "extraComponents"];
        break;
      case STEP_IDS.EXTRA_CONDITIONS:
        fieldsToValidate = ["extraConditions"];
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

        // Map form values to the requested JSONB structure
        const equipmentDetail = {
          version: 3,
          template: "TABLERO_ELECTRICO",
          general: {
            rotulo: initialPanel?.name || initialPanel?.codigo || "Tablero",
            tipo_tablero: values.panelType.toUpperCase(),
          },
          detalle_tecnico: {
            fases: values.phase,
            voltaje: Number(values.voltage),
            tipo_tablero: values.panelType.toUpperCase(),
          },
          itg: values.itgCircuits.map((itg, idx) => ({
            label: `ITG ${idx + 1}`,
            suministra: values.itgDescriptions[idx] || "N/A",
            items: {
              itm: {
                label: "ITM",
                type: "array",
                items: itg.circuits.map(circuit => ({
                  fases: circuit.phaseITM,
                  amperaje: Number(circuit.amperajeITM),
                  interruptor_diferencial: circuit.hasID ? {
                    label: "Interruptor diferencial",
                    properties: {
                      fases: circuit.phaseITM, // Mimicking structure
                      amperaje: Number(circuit.amperajeID),
                    }
                  } : null
                }))
              }
            }
          })),
          componentes_tablero: {
            label: "Equipamiento adicional del tablero",
            properties: {
              relays: values.extraComponents.relays.map(r => ({ codigo: r.id, circuito: r.description })),
              timers: values.extraComponents.timers.map(t => ({ codigo: t.id, circuito: t.description })),
              medidores: values.extraComponents.medidores.map(m => ({ codigo: m.id, circuito: m.description })),
              contactores: values.extraComponents.contactores.map(c => ({ codigo: c.id, circuito: c.description })),
              termostatos: values.extraComponents.termostato.map(t => ({ codigo: t.id, circuito: t.description })),
              ventiladores: values.extraComponents.ventiladores.map(v => ({ codigo: v.id, circuito: v.description })),
            }
          },
          condiciones_especiales: {
            label: "Condiciones especiales",
            properties: {
              barra_tierra: values.extraConditions.barraTierra,
              mandil_proteccion: values.extraConditions.mandilProteccion,
              terminal_electrico: values.extraConditions.terminalesElectricos,
              puerta_mandil_aterrados: values.extraConditions.puertaMandilAterrados,
              mangas_termo_contraibles: values.extraConditions.mangasTermoContraibles,
              diagrama_unifilar_directorio: values.extraConditions.diagramaUnifilarDirectorio,
            }
          }
        };

        if (initialPanel?.id) {
          await supabaseElectricalPanelService.updateEquipmentDetail(initialPanel.id, equipmentDetail);
          Alert.alert("Configuración guardada", "El equipo ha sido configurado correctamente.", [{ text: "OK", onPress: () => router.back() }]);
        } else {
          throw new Error("ID de panel no encontrado");
        }
      } catch (error) {
        console.error("Error saving panel configuration:", error);
        Alert.alert("Error", "No se pudo guardar la configuración. Por favor reintente.");
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
