// Import all functions first (ESLint requires imports at top)
import { initDatabase, ensureInitialized, withLock } from './connection';
import { clearMirrorTables, bulkInsertMirrorData } from './sync';
import {
  saveOfflineMaintenance,
  getPendingMaintenances,
  updateMaintenanceStatus,
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
} from './grounding-well';
import { getPendingPhotos, updatePhotoStatus } from './photos';
import {
  saveCurrentUser,
  getLocalUserById,
  updateLocalUserRole,
} from './users';
import { saveSession, getSession, clearSession } from './session';
import {
  getLocalEquipments,
  getEquipmentById,
  getLocalProperties,
  getEquipamentosByProperty,
  getElectricalPanelsByProperty,
  getEquipmentByProperty,
  getLocalScheduledMaintenances,
  getLocalMaintenancesByProperty,
} from './queries';
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

// Create DatabaseService object for backward compatibility
export const DatabaseService = {
  // Connection
  initializationPromise: null as Promise<void> | null,
  initDatabase,
  ensureInitialized,

  // Sync
  clearMirrorTables,
  bulkInsertMirrorData,

  // Maintenance
  saveOfflineMaintenance,
  getPendingMaintenances,
  updateMaintenanceStatus,

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

  // Equipment CRUD
  createEquipment,
  softDeleteEquipment,
  generateEquipmentCode,

  // Utils
  withLock,
};
