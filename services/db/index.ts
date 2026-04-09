// Import all functions first (ESLint requires imports at top)
import { initDatabase, ensureInitialized, withLock } from './connection';
import {
  clearMirrorTables,
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
  getEquipamentosByProperty,
  getElectricalPanelsByProperty,
  getEquipmentByProperty,
  getLocalScheduledMaintenances,
  getLocalMaintenancesByProperty,
  getLocalScheduledMaintenanceById,
  updateLocalScheduledMaintenanceStatus,
  getLocalSessionsByProperty,
  getInstrumentsByEquipmentType,
  getChecklistQuestionsByEquipamento,
} from './queries';
import {
  getAuditQuestions,
  getAssignedPropertiesForAuditor,
  saveOfflineAuditSession,
  getAuditSessionsByProperty,
  getPendingAuditSessions,
  updateOfflineAuditSessionStatus,
} from './audit';
import {
  createEquipment,
  softDeleteEquipment,
  generateEquipmentCode,
} from './equipment';

// Re-export all database functions from modular files
export * from './connection';
export * from './sync';
export * from './maintenance';
export * from './panel-configuration';
export * from './grounding-well';
export * from './photos';
export * from './users';
export * from './session';
export * from './queries';
export * from './equipment';
export * from './session-photos';
export * from './audit';

// Create DatabaseService object for backward compatibility
export const DatabaseService = {
  // Connection
  initializationPromise: null as Promise<void> | null,
  initDatabase,
  ensureInitialized,

  // Sync
  clearMirrorTables,
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
  updateLocalUserRole,

  // Session
  saveSession,
  getSession,
  clearSession,

  // Queries
  getLocalEquipments,
  getEquipmentById,
  getLocalProperties,
  getEquipamentosByProperty,
  getElectricalPanelsByProperty,
  getEquipmentByProperty,
  getLocalScheduledMaintenances,
  getLocalMaintenancesByProperty,
  getLocalScheduledMaintenanceById,
  updateLocalScheduledMaintenanceStatus,
  getLocalSessionsByProperty,
  getInstrumentsByEquipmentType,
  getChecklistQuestionsByEquipamento,

  // Audit
  getAuditQuestions,
  getAssignedPropertiesForAuditor,
  saveOfflineAuditSession,
  getAuditSessionsByProperty,
  getPendingAuditSessions,
  updateOfflineAuditSessionStatus,

  // Equipment CRUD
  createEquipment,
  softDeleteEquipment,
  generateEquipmentCode,

  // Session Photos
  saveOfflineSessionPhotos,
  sessionHasPhotos,
  getPendingSessionPhotos,
  updateSessionPhotoStatus,
  getLocalSessionPhotos,

  // Utils
  withLock,
};
