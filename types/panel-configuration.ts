export type PanelType = "adosado" | "empotrado";
export type PhaseType = "mono_2w" | "tri_3w" | "tri_4w";
export type CableType = "libre_halogeno" | "no_libre_halogeno";

export interface CircuitConfig {
    phaseITM: PhaseType;
    amperajeITM: string;
    diameter?: string;
    cableType?: CableType;
    hasID: boolean;
    phaseID?: PhaseType;
    amperajeID?: string;
    diameterID?: string;
    cableTypeID?: CableType;
    supply: string;
}

export interface PanelData {
    name?: string;
    id?: string;
}

export interface BasicInfoStepProps {
    panel: PanelData | null;
    panelType: PanelType;
    setPanelType: (type: PanelType) => void;
    voltage: string;
    setVoltage: (voltage: string) => void;
    phase: PhaseType;
    setPhase: (phase: PhaseType) => void;
}

export interface ITGConfigStepProps {
    panel: PanelData | null;
    itgCount: string;
    setItgCount: (count: string) => void;
    itgDescriptions: string[];
    setItgDescriptions: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface ITGCircuitData {
    cnPrefix: string;
    circuitsCount: string;
    circuits: CircuitConfig[];
}

export interface CircuitsConfigStepProps {
    panel: PanelData | null;
    itgDescriptions: string[];
    itgCircuits: ITGCircuitData[];
    setItgCircuits: React.Dispatch<React.SetStateAction<ITGCircuitData[]>>;
    navigationHandlers?: React.MutableRefObject<{
        handleNext: () => void;
        handleBack: () => void;
    } | null>;
}

export type ExtraComponentType =
    | "contactores"
    | "relays"
    | "ventiladores"
    | "termostato"
    | "medidores"
    | "timers";

export interface ExtraComponent {
    id: string;
    description: string;
}

export interface ExtraComponentsStepProps {
    panel: PanelData | null;
    enabledComponents: ExtraComponentType[];
    setEnabledComponents: React.Dispatch<
        React.SetStateAction<ExtraComponentType[]>
    >;
    extraComponents: Record<ExtraComponentType, ExtraComponent[]>;
    setExtraComponents: React.Dispatch<
        React.SetStateAction<Record<ExtraComponentType, ExtraComponent[]>>
    >;
}

export interface ExtraConditions {
    mandilProteccion: boolean;
    puertaMandilAterrados: boolean;
    barraTierra: boolean;
    terminalesElectricos: boolean;
    mangasTermoContraibles: boolean;
    diagramaUnifilarDirectorio: boolean;
}

export interface ExtraConditionsStepProps {
    panel: PanelData | null;
    extraConditions: ExtraConditions;
    setExtraConditions: React.Dispatch<React.SetStateAction<ExtraConditions>>;
}

export interface ReviewStepProps {
    panel: PanelData | null;
    panelType: PanelType;
    voltage: string;
    phase: PhaseType;
    itgDescriptions: string[];
    itgCircuits: ITGCircuitData[];
    enabledComponents: ExtraComponentType[];
    extraComponents: Record<ExtraComponentType, ExtraComponent[]>;
    extraConditions: ExtraConditions;
}
