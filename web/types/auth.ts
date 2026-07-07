export type AdminRole = 'SUPERVISOR' | 'TECNICO' | 'AUDITOR' | 'SUPERADMIN' | 'TECNICO_REMS';

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: AdminRole;
  is_active: boolean;
}

export interface AuthResult {
  errorMessage: string | null;
}
