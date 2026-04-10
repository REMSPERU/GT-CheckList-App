// PDF Report Types

/**
 * Available report types
 */
export enum ReportType {
  TECHNICAL = 'technical',
  OPERABILITY = 'operability',
  PROTOCOL = 'protocol',
  EMERGENCY_LIGHTS = 'emergency_lights',
  PAT = 'pat',
}

export interface ReportTypeOption {
  type: ReportType;
  name: string;
  description: string;
  icon: string;
}

export const REPORT_TYPE_OPTIONS: ReportTypeOption[] = [
  {
    type: ReportType.TECHNICAL,
    name: 'Informe Técnico',
    description: 'Incluye fotos, mediciones y observaciones',
    icon: 'document-text',
  },
  {
    type: ReportType.PROTOCOL,
    name: 'Protocolo de Mantenimiento',
    description: 'Detalle de pruebas y verificaciones realizadas',
    icon: 'list-circle',
  },
  {
    type: ReportType.OPERABILITY,
    name: 'Certificado de Operatividad',
    description: 'Solo equipos sin observaciones',
    icon: 'shield-checkmark',
  },
  {
    type: ReportType.EMERGENCY_LIGHTS,
    name: 'Reporte Luces de Emergencia',
    description: 'Informe técnico específico para luces de emergencia',
    icon: 'bulb',
  },
  {
    type: ReportType.PAT,
    name: 'Informe Técnico SPAT',
    description: 'Informe de mantenimiento de sistema de puesta a tierra',
    icon: 'flash',
  },
];

export interface EquipmentMaintenanceData {
  /** Equipment code/ID (e.g., #1234) */
  code: string;
  /** Equipment label (e.g., SG-1) */
  label: string;
  /** Equipment brand (e.g., OPALUX) */
  brand?: string;
  /** Equipment type (e.g., DISTRIBUCIÓN, AUTOSOPORTADO) */
  type: string;
  /** Location (e.g., PISO 1) */
  location: string;
  /** Detailed location within level/area (e.g., pasadizo, cuarto de bombas) */
  detalle_ubicacion?: string;
  /** Equipment model */
  model?: string;
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
  /** Protocol checklist data */
  protocol?: Record<string, boolean>;
}

export interface MaintenanceSessionReport {
  /** Client/Company name */
  clientName: string;
  /** Property/Building address */
  address: string;
  /** Property/Location name */
  locationName: string;
  /** Property code/reference */
  propertyCode?: string;
  /** Property city */
  propertyCity?: string;
  /** Property cover image URL */
  propertyImageUrl?: string | null;
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
    brand?: string;
    model: string;
    serial: string;
  };
  /** Measurement instruments info (when multiple are selected) */
  measurementInstruments?: {
    name: string;
    brand?: string;
    model: string;
    serial: string;
  }[];
  /** Session-level recommendations */
  recommendations?: string;
  /** Session-level conclusions */
  conclusions?: string;
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
  protocol?: Record<string, boolean>;
}

export interface SessionReportData {
  propertyName: string;
  propertyAddress?: string;
  sessionDate: string;
  generatedAt: string;
  maintenances: ReportMaintenanceData[];
}
