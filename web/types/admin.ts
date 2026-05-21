export interface AdminMetric {
  label: string;
  value: number;
  note: string;
}

export interface AdminEquipmentRow {
  id: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  config: boolean | null;
  propertyName: string;
  propertyCode: string | null;
  propertyCity: string | null;
  equipmentName: string;
  equipmentAbbreviation: string | null;
}

export interface AdminPaginatedResult<T> {
  items: T[];
  total: number;
}

export interface AdminEquipmentFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  propertyId?: string;
  systemId?: string;
  equipmentTypeId?: string;
}

export interface AdminEquipmentTypeRow {
  id: string;
  nombre: string;
  abreviatura: string | null;
  frecuencia: string | null;
  systemName: string;
  systemId: string | null;
}

export interface AdminChecklistQuestionRow {
  id: string;
  equipamento_id: string;
  systemName: string;
  equipmentName: string;
  pregunta: string;
  orden: number | null;
  activa: boolean | null;
  ponderado: number | string | null;
  updated_at: string | null;
}

export type AdminChecklistScheduleFrequency =
  | 'DIARIA'
  | 'INTERDIARIA'
  | 'SEMANAL'
  | 'MENSUAL';

export interface AdminChecklistScheduleRow {
  id: string;
  property_id: string;
  equipamento_id: string;
  propertyName: string;
  equipmentName: string;
  systemName: string;
  frequency: AdminChecklistScheduleFrequency;
  occurrences_per_day: number;
  window_start: string;
  window_end: string;
  timezone: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  updated_at: string | null;
}

export interface AdminChecklistScheduleUpsertInput {
  propertyId: string;
  equipamentoId: string;
  frequency: AdminChecklistScheduleFrequency;
  occurrencesPerDay: number;
  windowStart: string;
  windowEnd: string;
  timezone?: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  userId: string;
}

export interface AdminChecklistScheduleProgressItem {
  equipoId: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  submitted_at: string | null;
}

export interface AdminChecklistScheduleProgress {
  total: number;
  completed: AdminChecklistScheduleProgressItem[];
  pending: AdminChecklistScheduleProgressItem[];
}

export interface AdminChecklistAnswerItem {
  pregunta_id: string;
  pregunta: string;
  orden: number | null;
  ponderado?: number | string | null;
  status_ok: boolean | null;
  observacion: string | null;
  fotos: AdminChecklistPhotoRef[];
}

export interface AdminChecklistPhotoRef {
  bucket?: string | null;
  path?: string | null;
  public_url?: string | null;
  publicUrl?: string | null;
  url?: string | null;
}

export interface AdminChecklistResponseRow {
  id: string;
  client_submission_id: string | null;
  user_created: string | null;
  user_created_name: string | null;
  submitted_at: string | null;
  form_started_at: string | null;
  first_interaction_at: string | null;
  duration_seconds: number | null;
  interaction_count: number | null;
  equipo_id: string | null;
  building_name: string | null;
  equipamento_nombre: string | null;
  equipo_codigo: string | null;
  frequency: string | null;
  period_start: string | null;
  total_questions: number | null;
  total_ok: number | null;
  total_observed: number | null;
  total_photos: number | null;
  generalPhotos: AdminChecklistPhotoRef[];
  answers: AdminChecklistAnswerItem[];
}

export interface AdminPropertyRow {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  city: string | null;
  is_active: boolean | null;
  maintenance_priority: string | null;
}

export interface AdminMaintenanceRow {
  id: string;
  codigo: string | null;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  estatus: string | null;
  propertyName: string;
  equipmentCode: string | null;
  equipmentType: string;
}

export interface AdminChecklistResponseFilters {
  page: number;
  pageSize: number;
  equipamentoId?: string;
  buildingName?: string;
  search?: string;
  reviewStatus?: 'observed' | 'photos';
}

export interface AdminChecklistFilterOption {
  value: string;
  label: string;
}

export interface AdminChecklistResponseFilterOptions {
  buildings: AdminChecklistFilterOption[];
}

export interface AdminChecklistQuestionUpdateInput {
  id: string;
  activa: boolean;
  ponderado: string | number | null;
}

export interface AdminMaintenanceSessionRow {
  id: string;
  nombre: string | null;
  descripcion: string | null;
  fecha_programada: string | null;
  estatus: string | null;
  propertyId: string | null;
  propertyName: string;
  propertyCode: string | null;
  created_at: string | null;
  equipmentTypes: string[];
  equipmentCodes: string[];
  maintenancesCount: number;
  completedCount: number;
}

export interface AdminMaintenanceSessionFilters {
  search?: string;
  status?: string;
  propertyId?: string;
  equipmentTypeId?: string;
  startDate?: string;
  endDate?: string;
}
