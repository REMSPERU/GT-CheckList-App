// PDF Report Types

export interface EquipmentMaintenanceData {
  /** Equipment code/ID (e.g., #1234) */
  code: string;
  /** Equipment label (e.g., SG-1) */
  label: string;
  /** Equipment type (e.g., DISTRIBUCIÓN, AUTOSOPORTADO) */
  type: string;
  /** Location (e.g., PISO 1) */
  location: string;
  /** Voltage (e.g., 220) */
  voltage?: string;
  /** Amperage (e.g., 200) */
  amperage?: string;
  /** Cable size (e.g., 90mm) */
  cableSize?: string;
  /** Number of circuits */
  circuits?: number;
  /** Pre-maintenance photos (before) */
  prePhotos: { url: string; caption?: string }[];
  /** Thermography/measurement photos */
  thermoPhotos: { url: string; caption?: string }[];
  /** Post-maintenance photos (after) */
  postPhotos: { url: string; caption?: string }[];
  /** General observations for this equipment */
  observations?: string;
  /** Item-specific observations with photos */
  itemObservations?: Record<string, { note: string; photoUrl?: string }>;
}

export interface MaintenanceSessionReport {
  /** Client/Company name */
  clientName: string;
  /** Property/Building address */
  address: string;
  /** Property/Location name */
  locationName: string;
  /** Maintenance service motive */
  serviceDescription: string;
  /** Date of service (YYYY-MM-DD format) */
  serviceDate: string;
  /** Date report was generated */
  generatedAt: string;
  /** Maintenance session code */
  sessionCode?: string;
  /** List of equipment maintenances */
  equipments: EquipmentMaintenanceData[];
  /** Procedure steps performed */
  procedureSteps?: string[];
  /** Measurement instrument info */
  measurementInstrument?: {
    name: string;
    model: string;
    serial: string;
  };
}

// Legacy types for backward compatibility
export interface ReportMaintenanceData {
  maintenanceId: string;
  equipmentCode: string;
  equipmentLocation: string;
  propertyName: string;
  propertyAddress?: string;
  scheduledDate: string;
  completedAt: string;
  technicianName: string;
  maintenanceType: string;
  prePhotos: { url: string; category?: string }[];
  postPhotos: { url: string }[];
  checklist: Record<string, boolean>;
  measurements?: Record<
    string,
    {
      voltage?: string;
      amperage?: string;
      cableDiameter?: string;
      cableType?: string;
    }
  >;
  itemObservations: Record<
    string,
    {
      note: string;
      photoUrl?: string;
    }
  >;
  observations?: string;
}

export interface SessionReportData {
  propertyName: string;
  propertyAddress?: string;
  sessionDate: string;
  generatedAt: string;
  maintenances: ReportMaintenanceData[];
}
