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

export interface StepOneProps {
  panel: PanelData | null;
  panelType: PanelType;
  setPanelType: (type: PanelType) => void;
  voltage: string;
  setVoltage: (voltage: string) => void;
  phase: PhaseType;
  setPhase: (phase: PhaseType) => void;
}

export interface StepTwoProps {
  panel: PanelData | null;
  itgCount: string;
  setItgCount: (count: string) => void;
  itgDescriptions: string[];
  setItgDescriptions: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface StepThreeProps {
  panel: PanelData | null;
  cnPrefix: string;
  setCnPrefix: (prefix: string) => void;
  circuitsCount: string;
  setCircuitsCount: (count: string) => void;
  circuits: CircuitConfig[];
  setCircuits: React.Dispatch<React.SetStateAction<CircuitConfig[]>>;
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

export interface StepFourProps {
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

export interface StepFiveProps {
  panel: PanelData | null;
  panelType: PanelType;
  voltage: string;
  phase: PhaseType;
  itgDescriptions: string[];
  cnPrefix: string;
  circuits: CircuitConfig[];
  enabledComponents: ExtraComponentType[];
  extraComponents: Record<ExtraComponentType, ExtraComponent[]>;
}
