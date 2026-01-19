// Import all functions first (ESLint requires imports at top)
import { initDatabase, ensureInitialized } from './connection';
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
import { getPendingPhotos, updatePhotoStatus } from './photos';
import {
  saveCurrentUser,
  getLocalUserById,
  updateLocalUserRole,
} from './users';
import {
  getLocalEquipments,
  getEquipmentById,
  getLocalProperties,
  getEquipamentosByProperty,
  getElectricalPanelsByProperty,
  getEquipmentByProperty,
} from './queries';

// Re-export all database functions from modular files
export * from './connection';
export * from './sync';
export * from './maintenance';
export * from './panel-configuration';
export * from './photos';
export * from './users';
export * from './queries';

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

  // Photos
  getPendingPhotos,
  updatePhotoStatus,

  // Users
  saveCurrentUser,
  getLocalUserById,
  updateLocalUserRole,

  // Queries
  getLocalEquipments,
  getEquipmentById,
  getLocalProperties,
  getEquipamentosByProperty,
  getElectricalPanelsByProperty,
  getEquipmentByProperty,
};
