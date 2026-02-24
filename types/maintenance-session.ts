export interface PhotoItem {
  id: string;
  uri: string;
  timestamp?: string;
  notes?: string;
  category?: 'visual' | 'thermo';
  status?: 'pending' | 'synced' | 'error';
}

export interface ItemObservation {
  note: string;
  photoUri?: string;
  photoUris?: string[];
}

export interface ItemMeasurement {
  voltage?: string;
  amperage?: string;
  isVoltageInRange?: boolean;
  isAmperageInRange?: boolean;
  cableDiameter?: string;
  cableType?: string;
  originalCableDiameter?: string;
  originalCableType?: string;
}

export interface MaintenanceSession {
  sessionId: string;
  maintenanceId?: string;
  panelId: string;
  startTime: string;
  lastUpdated: string;
  // Photos
  prePhotos: PhotoItem[];
  postPhotos: PhotoItem[];
  // Checklist
  checklist: Record<string, boolean>; // itemId -> status (true=OK, false=Obs)
  // Measurements & Observations
  measurements?: Record<
    string,
    {
      voltage?: string;
      amperage?: string;
      isVoltageInRange?: boolean;
      isAmperageInRange?: boolean;
      cableDiameter?: string;
      cableType?: string;
      originalCableDiameter?: string;
      originalCableType?: string;
    }
  >;
  itemObservations: Record<string, { note: string; photoUri?: string }>;
  // General
  observations: string;
  recommendations: string;
  conclusions: string;
  // State
  currentStep: string; // 'pre-photos', 'checklist', 'post-photos', 'summary'
  isUploaded: boolean;

  // Selected Instruments
  selectedInstruments?: {
    id: string;
    instrumento: string;
    marca: string;
    modelo: string;
    serie: string;
    [key: string]: any; // Allow other fields if needed
  }[];

  protocol?: Record<string, boolean>;
  extraConditions?: Record<string, boolean>;

  // Context (for display)
  building?: {
    id: string;
    name: string;
    address: string;
  };
  maintenanceType?: string;
  propertyId?: string;
  propertyName?: string;
  sessionTotal?: number;
  sessionCompleted?: number;
  sessionDate?: string;
}
