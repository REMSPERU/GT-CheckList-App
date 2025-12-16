import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import {
    PanelType,
    PhaseType,
    CircuitConfig,
    PanelData,
    ExtraComponentType,
    ExtraComponent,
    ExtraConditions,
    ITGCircuitData,
} from "@/types/panel-configuration";

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

export function usePanelConfiguration(initialPanel: PanelData | null) {
    const router = useRouter();
    const [currentStepId, setCurrentStepId] = useState<StepId>(STEP_ORDER[0]);

    const [panelType, setPanelType] = useState<PanelType>("adosado");
    const [voltage, setVoltage] = useState<string>("220");
    const [phase, setPhase] = useState<PhaseType>("mono_2w");

    const [itgCount, setItgCount] = useState<string>("1");
    const [itgDescriptions, setItgDescriptions] = useState<string[]>(Array(3).fill(""));

    const [itgCircuits, setItgCircuits] = useState<ITGCircuitData[]>([{
        cnPrefix: "CN",
        circuitsCount: "1",
        circuits: [{ ...DEFAULT_CIRCUIT }],
    }]);

    const [enabledComponents, setEnabledComponents] = useState<ExtraComponentType[]>([]);
    const [extraComponents, setExtraComponents] = useState<Record<ExtraComponentType, ExtraComponent[]>>({
        contactores: [],
        relays: [],
        ventiladores: [],
        termostato: [],
        medidores: [],
        timers: [],
    });

    const [extraConditions, setExtraConditions] = useState<ExtraConditions>({
        mandilProteccion: false,
        puertaMandilAterrados: false,
        barraTierra: false,
        terminalesElectricos: false,
        mangasTermoContraibles: false,
        diagramaUnifilarDirectorio: false,
    });

    useEffect(() => {
        const n = Math.max(0, parseInt(itgCount || "0", 10));
        setItgDescriptions((prev) => {
            const next = [...prev];
            if (n > next.length) {
                for (let i = next.length; i < n; i++) next.push("");
            } else if (n < next.length) {
                next.length = n;
            }
            return next;
        });
    }, [itgCount]);

    useEffect(() => {
        const n = Math.max(0, parseInt(itgCount || "0", 10));
        setItgCircuits((prev) => {
            const next = [...prev];
            while (next.length < n) {
                next.push({
                    cnPrefix: "CN",
                    circuitsCount: "1",
                    circuits: [{ ...DEFAULT_CIRCUIT }],
                });
            }
            if (next.length > n) {
                next.length = n;
            }
            return next;
        });
    }, [itgCount]);

    const validateStepOne = (): boolean => {
        if (!voltage.trim()) {
            Alert.alert("Validación", "Ingrese el voltaje.");
            return false;
        }
        return true;
    };

    const validateStepTwo = (): boolean => {
        const n = parseInt(itgCount || "0", 10);
        if (isNaN(n) || n < 1) {
            Alert.alert("Validación", "Indique al menos 1 IT-G.");
            return false;
        }
        return true;
    };

    const validateStepThree = (): boolean => {
        for (let i = 0; i < itgCircuits.length; i++) {
            const itg = itgCircuits[i];
            if (!itg.cnPrefix.trim()) {
                //Alert.alert("Validación", `Ingrese el prefijo para IT-G${i + 1} (por ejemplo, CN o SA).`);
                return false;
            }
            const c = parseInt(itg.circuitsCount || "0", 10);
            if (isNaN(c) || c < 1) {
                //Alert.alert("Validación", `Indique al menos 1 circuito para IT-G${i + 1}.`);
                return false;
            }
        }
        return true;
    };

    const validateCurrentStep = (): boolean => {
        switch (currentStepId) {
            case STEP_IDS.BASIC_INFO:
                return validateStepOne();
            case STEP_IDS.ITG_CONFIG:
                return validateStepTwo();
            case STEP_IDS.CIRCUITS:
                return validateStepThree();
            default:
                return true;
        }
    };

    const goNext = () => {
        if (!validateCurrentStep()) return;
        const currentIndex = getStepIndex(currentStepId);
        if (isLastStep(currentStepId)) {
            Alert.alert("Configuración guardada", "El equipo ha sido configurado correctamente.", [{ text: "OK", onPress: () => router.back() }]);
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
        panelType,
        setPanelType,
        voltage,
        setVoltage,
        phase,
        setPhase,
        itgCount,
        setItgCount,
        itgDescriptions,
        setItgDescriptions,
        itgCircuits,
        setItgCircuits,
        enabledComponents,
        setEnabledComponents,
        extraComponents,
        setExtraComponents,
        extraConditions,
        setExtraConditions,
        goNext,
        goBack,
    };
}
