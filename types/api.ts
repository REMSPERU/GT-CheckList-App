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
