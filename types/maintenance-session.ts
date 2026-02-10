export interface PhotoItem {
  id: string; // local URI or UUID
  uri: string;
  status: 'pending' | 'uploading' | 'error' | 'done';
  remotePath?: string;
  url?: string;
  category?: 'visual' | 'thermo';
}

export type MaintenanceStep =
  | 'pre-photos'
  | 'checklist'
  | 'post-photos'
  | 'protocol-checklist'
  | 'summary';

export interface ItemObservation {
  note: string;
  photoUri?: string;
  photoUris?: string[]; // Support multiple photos
}

export interface ItemMeasurement {
  voltage?: string;
  amperage?: string;
  isVoltageInRange?: boolean;
  isAmperageInRange?: boolean;
  // Cable fields
  cableDiameter?: string;
  cableType?: string;
  originalCableDiameter?: string;
  originalCableType?: string;
}

export interface MaintenanceSession {
  sessionId: string;
  maintenanceId?: string; // If linked to a scheduled maintenance
  panelId: string;
  startTime: string;
  lastUpdated: string;

  // Context for Navigation
  building?: any; // To return to selection screen
  maintenanceType?: string;
  propertyId?: string; // For scheduled maintenance return
  propertyName?: string; // For scheduled maintenance return
  // Session context for last equipment detection
  sessionTotal?: number;
  sessionCompleted?: number;
  sessionDate?: string;

  // Data
  prePhotos: PhotoItem[];
  postPhotos: PhotoItem[];
  checklist: Record<string, boolean | string>; // stepId -> value
  measurements?: Record<string, ItemMeasurement>; // itemId -> measurement
  itemObservations: Record<string, ItemObservation>;
  observations: string;
  protocol?: Record<string, boolean>;
  recommendations: string; // Recomendaciones del técnico
  conclusions: string; // Conclusiones del mantenimiento

  // Progress
  currentStep: MaintenanceStep;
  isUploaded: boolean;
}
