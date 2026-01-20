// API Type Definitions based on OpenAPI spec

export enum RoleEnum {
  GUEST = 'GUEST',
  PROVEEDOR = 'PROVEEDOR',
  TECNICO = 'TECNICO',
  SUPERVISOR = 'SUPERVISOR',
  SUPERADMIN = 'SUPERADMIN',
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  role: RoleEnum;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

// Auth Request types
export interface LoginRequest {
  email_or_username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// Auth Response types
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  role: RoleEnum;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

// Error types
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ErrorResponse {
  detail: ValidationError[] | string;
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: ErrorResponse;
  status: number;
}

// Property types
export interface PropertyResponse {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  property_type: string;
  total_area_sqm?: number | null;
  floors?: number | null;
  construction_year?: number | null;
  manager_name?: string | null;
  manager_email?: string | null;
  manager_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  is_active: boolean;
  maintenance_priority: string;
  created_at: string;
  updated_at?: string | null;
  device_count?: number | null;
  active_device_count?: number | null;
  assigned_users_count?: number | null;
}

export interface PropertyCreateRequest {
  code: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state?: string | null;
  country?: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  property_type?: string;
  total_area_sqm?: number | null;
  floors?: number | null;
  construction_year?: number | null;
  manager_name?: string | null;
  manager_email?: string | null;
  manager_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  maintenance_priority?: string;
}

export interface PropertyListResponse {
  items: PropertyResponse[];
  total: number;
  skip: number;
  limit: number;
}

// Equipamento types
export interface EquipamentoResponse {
  id: string;
  nombre: string;
  abreviatura: string;
}

export interface EquipamentoListResponse {
  items: EquipamentoResponse[];
  total: number;
}

// Equipment Detail Types
export interface Differential {
  fases: string;
  existe: boolean;
  amperaje: number;
  tipo_cable: string;
  diametro_cable: string;
}

export interface ITM {
  id: string;
  fases: string;
  amperaje: number;
  suministra: string;
  tipo_cable: string;
  diametro_cable: string;
  diferencial?: Differential;
}

export interface ITG {
  id: string;
  itms: ITM[];
  prefijo: string;
  suministra: string;
}

export interface ComponentItem {
  codigo: string;
  suministra: string;
}

export interface Componente {
  tipo: string;
  items: ComponentItem[];
}

export interface TechnicalDetail {
  fases: string;
  voltaje: number;
  tipo_tablero: string;
}

export interface SpecialConditions {
  barra_tierra: boolean;
  mandil_proteccion: boolean;
  terminal_electrico: boolean;
  puerta_mandil_aterrados: boolean;
  mangas_termo_contraibles: boolean;
  diagrama_unifilar_directorio: boolean;
  [key: string]: boolean; // Allow other keys just in case
}

export interface EquipmentDetail {
  itgs: ITG[];
  rotulo: string;
  componentes: Componente[];
  tipo_tablero: string;
  detalle_tecnico: TechnicalDetail;
  condiciones_especiales: SpecialConditions;
}

// Base Equipment interface (shared by all equipment types from 'equipos' table)
export interface BaseEquipment {
  id: string;
  id_property: string;
  id_equipamento?: string;
  codigo: string;
  ubicacion: string;
  detalle_ubicacion: string;
  estatus: string;
  config: boolean;
  equipment_detail?: Record<string, any> | null;
  created?: string;
}

// TableroElectrico types
export interface TableroElectricoResponse extends BaseEquipment {
  tipo?: string;
  equipment_detail?: EquipmentDetail;
}

// Maintenance types
export enum MaintenanceStatusEnum {
  NO_INICIADO = 'NO_INICIADO',
  EN_PROGRESO = 'EN_PROGRESO',
  PENDIENTE = 'PENDIENTE',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
}

export enum MaintenanceTypeEnum {
  PREVENTIVO = 'Preventivo',
  CORRECTIVO = 'Correctivo',
}

export interface MaintenanceCreateRequest {
  id_equipo?: string | null;
  panel_ids?: string[];
  dia_programado: string;
  hora_programada: string;
  tipo_mantenimiento: MaintenanceTypeEnum;
  assigned_technicians: string[];
  observations?: string;
  id_user_created?: string;
  codigo?: string;
}

export interface MaintenanceResponse {
  id: string;
  created_at: string;
  estatus: MaintenanceStatusEnum;
  dia_programado: string | null;
  tipo_mantenimiento: string | null;
  id_equipo?: string;
  codigo?: string;
}

export interface Technician extends User {}
