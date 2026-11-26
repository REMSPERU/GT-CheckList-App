export type GemaRole =
  | 'SUPERVISOR'
  | 'TECNICO'
  | 'AUDITOR'
  | 'SUPERADMIN'
  | 'PROVEEDOR'
  | 'GUEST';

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

  return {
    canUseChecklists: isTechnician || isAuditor || isAdmin,
    canScheduleChecklists: isAdmin,
    canViewInventory: isAuditor || isSupervisor,
    canEditAssets: isAuditor || isSupervisor,
    canManageAssets: isSupervisor,
    canScheduleMaintenance: isSupervisor,
    canExecuteMaintenance: isSupervisor,
    canGenerateMaintenanceReports: isSupervisor,
    canScanEquipment: isTechnician || isAuditor || isSupervisor,
    hasAssignedPropertyScope: isTechnician || isAuditor,
  };
}
