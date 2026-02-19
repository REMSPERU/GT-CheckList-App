export type PanelType = 'adosado' | 'empotrado';
export type PhaseType = 'mono_2w' | 'tri_3w' | 'tri_4w' | 'unipolar';
export type CableType = 'libre_halogeno' | 'no_libre_halogeno';
export type InterruptorType = 'itm' | 'id';

// ITM hijo que vive dentro de un ID
export interface SubITM {
  phaseITM: PhaseType;
  amperajeITM: string;
  diameter: string;
  cableType?: CableType;
  supply: string;
}

export interface CircuitConfig {
  name?: string;
  interruptorType: InterruptorType;

  // Campos del interruptor principal (ITM o ID)
  phase: PhaseType;
  amperaje: string;
  diameter: string;
  cableType?: CableType;
  supply: string;

  // Para ITM: toggle de ID opcional
  hasID: boolean;
  phaseID?: PhaseType;
  amperajeID?: string;
  diameterID?: string;
  cableTypeID?: CableType;

  // Para ID: ITMs hijos (1-3)
  subITMsCount: string;
  subITMs: SubITM[];
}

export interface PanelData {
  id?: string;
  codigo?: string;
  id_property?: string;
  equipment_detail?: any; // JSONB structure - contiene el rotulo
}

export interface BasicInfoStepProps {
  panel: PanelData | null;
}

export interface ITGConfigStepProps {
  panel: PanelData | null;
  updateITGCount?: (count: string) => void;
}

export interface ITGCircuitData {
  cnPrefix: string;
  circuitsCount: string;
  circuits: CircuitConfig[];
}

export interface CircuitsConfigStepRef {
  handleNext: () => boolean | Promise<boolean>;
  handleBack: () => boolean;
}

export interface CircuitsConfigStepProps {
  panel: PanelData | null;
}

export type ExtraComponentType =
  | 'contactores'
  | 'relays'
  | 'ventiladores'
  | 'termostato'
  | 'medidores'
  | 'timers';

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
