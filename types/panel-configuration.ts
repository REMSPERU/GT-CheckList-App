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
  codigo?: string;
}

export interface BasicInfoStepProps {
  panel: PanelData | null;
}

export interface ITGConfigStepProps {
  panel: PanelData | null;
}

export interface ITGCircuitData {
  cnPrefix: string;
  circuitsCount: string;
  circuits: CircuitConfig[];
}

export interface CircuitsConfigStepProps {
  panel: PanelData | null;
  navigationHandlers?: React.MutableRefObject<{
    handleNext: () => boolean;
    handleBack: () => boolean;
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
}

export interface ReviewStepProps {
  panel: PanelData | null;
}
