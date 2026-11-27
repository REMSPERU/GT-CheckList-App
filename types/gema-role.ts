export type GemaRole =
  | 'SUPERVISOR'
  | 'TECNICO'
  | 'AUDITOR'
  | 'SUPERADMIN'
  | 'PROVEEDOR'
  | 'GUEST';

export const PROVIDER_ROLE_AVAILABLE_FOR_ASSIGNMENT = false;

/** Accept the legacy value while saved sessions and assignments are migrated. */
export function normalizeGemaRole(value: unknown): GemaRole | null {
  switch (value) {
    case 'TECNICO_REMS':
      return 'TECNICO';
    case 'SUPERVISOR':
    case 'TECNICO':
    case 'AUDITOR':
    case 'SUPERADMIN':
    case 'PROVEEDOR':
    case 'GUEST':
      return value;
    default:
      return null;
  }
}

export function getGemaPermissions(role: GemaRole | null) {
  const isAdmin = role === 'SUPERADMIN';
  const isSupervisor = role === 'SUPERVISOR' || isAdmin;
  const isAuditor = role === 'AUDITOR';
  const isTechnician = role === 'TECNICO';
  const isProvider = role === 'PROVEEDOR';

  return {
    canUseChecklists: isTechnician || isAuditor || isAdmin,
    canScheduleChecklists: isAdmin,
    canViewInventory: isAuditor || isSupervisor,
    canEditAssets: isAuditor || isSupervisor,
    canManageAssets: isSupervisor,
    canScheduleMaintenance: isSupervisor || isProvider,
    canExecuteMaintenance: isSupervisor || isProvider,
    canGenerateMaintenanceReports: isSupervisor || isProvider,
    canScanEquipment: isTechnician || isAuditor || isSupervisor,
    hasAssignedPropertyScope: isTechnician || isAuditor || isProvider,
  };
}
