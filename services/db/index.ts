// Import all functions first (ESLint requires imports at top)
import { initDatabase, ensureInitialized, withLock } from './connection';
import {
  clearMirrorTables,
  hasUsableLocalMirror,
  bulkInsertMirrorData,
  upsertCreatedMaintenanceLocally,
  cleanupOfflineQueue,
} from './sync';
import {
  saveOfflineMaintenance,
  getPendingMaintenances,
  updateMaintenanceStatus,
  getLatestOfflineMaintenanceByMaintenanceId,
  getOfflineMaintenanceByLocalId,
} from './maintenance';
import {
  saveOfflinePanelConfiguration,
  getPendingPanelConfigurations,
  updatePanelConfigurationStatus,
} from './panel-configuration';
import {
  saveOfflineEquipment,
  getPendingEquipos,
  updateOfflineEquipmentStatus,
} from './equipment-offline';
import {
  saveOfflineGroundingWellChecklist,
  getPendingGroundingWellChecklists,
  updateGroundingWellChecklistStatus,
  getPendingGroundingWellChecklistPhotos,
  updateGroundingWellChecklistPhotoStatus,
  getGroundingWellChecklistByLocalId,
  getLatestOfflineGroundingWellChecklistByMaintenanceId,
  getGroundingWellChecklistPhotosByLocalId,
  getLatestOfflineGroundingWellChecklistByPanelId,
} from './grounding-well';
import { getPendingPhotos, updatePhotoStatus } from './photos';
import {
  saveCurrentUser,
  getLocalUserById,
  getLocalUsers,
  updateLocalUserRole,
} from './users';
import { saveSession, getSession, clearSession } from './session';
import {
  saveOfflineSessionPhotos,
  sessionHasPhotos,
  getPendingSessionPhotos,
  updateSessionPhotoStatus,
  getLocalSessionPhotos,
} from './session-photos';
import {
  getLocalEquipments,
  getEquipmentById,
  getLocalProperties,
  getLocalPropertyById,
  getEquipamentosByProperty,
  getChecklistSystemsByProperty,
  getElectricalPanelsByProperty,
  getEquipmentByProperty,
  getChecklistLaunchDataByEquipmentCode,
  getLocalScheduledMaintenances,
  getLocalMaintenancesByProperty,
  getLocalScheduledMaintenanceById,
  updateLocalScheduledMaintenanceStatus,
  getLocalSessionsByProperty,
  getInstrumentsByEquipmentType,
  getChecklistQuestionsByEquipamento,
  getInventorySystemsByProperty,
  getInventoryEquipamentosBySystem,
  getInventoryEquiposByEquipamento,
  getInventoryEquipoById,
  getAllInventoryEquipamentos,
} from './queries';
import {
  getAuditQuestions,
  getAssignedPropertiesForAuditor,
  saveOfflineAuditSession,
  getAuditSessionsByProperty,
  getPendingAuditSessions,
  updateOfflineAuditSessionStatus,
  updateOfflineAuditSessionPayload,
  updateOfflineAuditSessionUploadProgress,
  upsertSyncedAuditSessions,
} from './audit';
import {
  saveOfflineChecklistResponse,
  getPendingChecklistResponses,
  updateOfflineChecklistResponseStatus,
  getChecklistPhotosByLocalId,
  updateOfflineChecklistPhotoStatus,
  getChecklistCountsByEquipo,
} from './checklist';
import {
  createEquipment,
  updateEquipment,
  softDeleteEquipment,
  generateEquipmentCode,
} from './equipment';
import { getLocalBrandsForEquipment } from './brands';

// Re-export all database functions from modular files
export * from './connection';
export * from './sync';
export * from './brands';
export * from './maintenance';
export * from './panel-configuration';
export * from './equipment-offline';
export * from './grounding-well';
export * from './photos';
export * from './users';
export * from './session';
export * from './queries';
export * from './equipment';
export * from './session-photos';
export * from './audit';
export * from './checklist';

// Create DatabaseService object for backward compatibility
export const DatabaseService = {
  // Connection
  initializationPromise: null as Promise<void> | null,
  initDatabase,
  ensureInitialized,

  // Sync
  clearMirrorTables,
  hasUsableLocalMirror,
  bulkInsertMirrorData,
  upsertCreatedMaintenanceLocally,
  cleanupOfflineQueue,

  // Maintenance
  saveOfflineMaintenance,
  getPendingMaintenances,
  updateMaintenanceStatus,
  getLatestOfflineMaintenanceByMaintenanceId,
  getOfflineMaintenanceByLocalId,

  // Panel Configuration
  saveOfflinePanelConfiguration,
  getPendingPanelConfigurations,
  updatePanelConfigurationStatus,

  // Equipment Offline
  saveOfflineEquipment,
  getPendingEquipos,
  updateOfflineEquipmentStatus,

  // Grounding Well
  saveOfflineGroundingWellChecklist,
  getPendingGroundingWellChecklists,
  updateGroundingWellChecklistStatus,
  getPendingGroundingWellChecklistPhotos,
  updateGroundingWellChecklistPhotoStatus,
  getGroundingWellChecklistByLocalId,
  getLatestOfflineGroundingWellChecklistByMaintenanceId,
  getGroundingWellChecklistPhotosByLocalId,
  getLatestOfflineGroundingWellChecklistByPanelId,

  // Photos
  getPendingPhotos,
  updatePhotoStatus,

  // Users
  saveCurrentUser,
  getLocalUserById,
  getLocalUsers,
  updateLocalUserRole,

  // Session
  saveSession,
  getSession,
  clearSession,

  // Queries
  getLocalEquipments,
  getEquipmentById,
  getLocalProperties,
  getLocalPropertyById,
  getEquipamentosByProperty,
  getChecklistSystemsByProperty,
  getElectricalPanelsByProperty,
  getEquipmentByProperty,
  getChecklistLaunchDataByEquipmentCode,
  getLocalScheduledMaintenances,
  getLocalMaintenancesByProperty,
  getLocalScheduledMaintenanceById,
  updateLocalScheduledMaintenanceStatus,
  getLocalSessionsByProperty,
  getInstrumentsByEquipmentType,
  getChecklistQuestionsByEquipamento,

  // Inventory Queries
  getInventorySystemsByProperty,
  getInventoryEquipamentosBySystem,
  getInventoryEquiposByEquipamento,
  getInventoryEquipoById,
  getAllInventoryEquipamentos,

  // Audit
  getAuditQuestions,
  getAssignedPropertiesForAuditor,
  saveOfflineAuditSession,
  getAuditSessionsByProperty,
  getPendingAuditSessions,
  updateOfflineAuditSessionStatus,
  updateOfflineAuditSessionPayload,
  updateOfflineAuditSessionUploadProgress,
  upsertSyncedAuditSessions,

  // Checklist
  saveOfflineChecklistResponse,
  getPendingChecklistResponses,
  updateOfflineChecklistResponseStatus,
  getChecklistPhotosByLocalId,
  updateOfflineChecklistPhotoStatus,
  getChecklistCountsByEquipo,

  // Equipment CRUD
  createEquipment,
  updateEquipment,
  softDeleteEquipment,
  generateEquipmentCode,

  // Brands
  getLocalBrandsForEquipment,

  // Session Photos
  saveOfflineSessionPhotos,
  sessionHasPhotos,
  getPendingSessionPhotos,
  updateSessionPhotoStatus,
  getLocalSessionPhotos,

  // Utils
  withLock,
};
