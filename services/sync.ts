import { supabase } from '@/lib/supabase';
import { DatabaseService } from './db';
import { supabaseMaintenanceService } from './supabase-maintenance.service';
import { supabaseElectricalPanelService } from './supabase-electrical-panel.service';
import { supabaseGroundingWellService } from './supabase-grounding-well.service';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue } from './sync-queue';

// --- Interfaces ---
interface OfflineMaintenance {
  local_id: number;
  id_mantenimiento: string | null;
  user_created: string;
  detail_maintenance: string; // JSON string
  protocol: string | null; // JSON string
  status: string;
}

interface OfflinePhoto {
  id: number;
  maintenance_local_id: number;
  local_uri: string;
  type: 'pre' | 'post' | 'observation';
  category?: string;
  observation_key?: string;
  status: string;
}

// --- Class Definition ---
class SyncService {
  private isConnected = false;
  // Use 'any' to avoid NodeJS.Timer vs number conflicts in React Native
  private pollIntervalId: any = null;
  private isSyncing = false;
  private currentSyncPromise: Promise<boolean> | null = null;

  constructor() {
    this.init();
    this.registerSyncHandlers();
  }

  init() {
    // Initial check
    this.checkNetworkAndMaybeSync();

    // Polling safety check every 15s
    this.pollIntervalId = setInterval(() => {
      this.checkNetworkAndMaybeSync();
    }, 15000);

    // Network event listener
    NetInfo.addEventListener((state: any) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;
      if (this.isConnected && !wasConnected) {
        this.syncOnReconnect();
      }
    });
  }

  cleanup() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private registerSyncHandlers() {
    if (typeof syncQueue !== 'undefined') {
      syncQueue.registerHandler('panel_config', async (panelId: string) => {
        console.log('[SYNC-HANDLER] Triggered for:', panelId);
        await this.syncPendingPanelConfigs(panelId);
      });
    }
  }

  private async checkNetworkAndMaybeSync() {
    const state = await NetInfo.fetch();
    const wasConnected = this.isConnected;
    this.isConnected = state.isConnected ?? false;

    if (this.isConnected && !wasConnected) {
      this.syncOnReconnect();
    }
  }

  private async syncOnReconnect() {
    if (this.isSyncing) return;
    console.log('Auto-sync triggered on reconnect...');
    try {
      await this.pushData(); // Upload local changes
      await this.pullData(); // Download new data
      console.log('Auto-sync completed');
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }

  /**
   * MAIN UPLOAD ORCHESTRATOR
   * Executes sub-tasks sequentially.
   */
  async pushData() {
    await DatabaseService.ensureInitialized();
    if (!this.isConnected) return;

    console.log('[SYNC] Starting Batch Upload...');

    // 1. Sync Maintenances
    await this.syncPendingMaintenances();

    // 2. Sync Panel Configurations
    await this.syncPendingPanelConfigs();

    // 3. Sync Grounding Wells
    await this.syncPendingGroundingWells();

    console.log('[SYNC] Batch Upload Finished.');
  }

  // ----------------------------------------------------------------
  // SUB-ROUTINE 1: MAINTENANCES
  // ----------------------------------------------------------------
  private async syncPendingMaintenances() {
    const pendingItems =
      (await DatabaseService.getPendingMaintenances()) as OfflineMaintenance[];
    if (pendingItems.length === 0) return;

    console.log(`[SYNC-MAIN] Found ${pendingItems.length} pending items`);

    for (const item of pendingItems) {
      try {
        await DatabaseService.updateMaintenanceStatus(item.local_id, 'syncing');

        // A. Upload Photos
        const photos = (await DatabaseService.getPendingPhotos(
          item.local_id,
        )) as OfflinePhoto[];
        const photoUrlMap: Record<string, string> = {};

        for (const photo of photos) {
          try {
            // Determine folder based on type
            const folder =
              photo.type === 'pre'
                ? 'pre'
                : photo.type === 'post'
                  ? 'post'
                  : 'observations';

            console.log(
              `[SYNC] Uploading photo ${photo.id}: ${photo.local_uri} to /${folder}`,
            );
            const remoteUrl = await supabaseMaintenanceService.uploadPhoto(
              photo.local_uri,
              folder,
            );
            console.log(`[SYNC] Photo ${photo.id} uploaded: ${remoteUrl}`);

            await DatabaseService.updatePhotoStatus(
              photo.id,
              'synced',
              remoteUrl,
            );
            photoUrlMap[photo.local_uri] = remoteUrl;
          } catch (pError) {
            console.error(`Photo upload failed for ${photo.id}:`, pError);
            await DatabaseService.updatePhotoStatus(
              photo.id,
              'error',
              null,
              String(pError),
            );
            throw new Error('Photo upload failed'); // Stop this maintenance sync
          }
        }

        // B. Reconstruct JSON with remote URLs
        const detail = JSON.parse(item.detail_maintenance);
        const replaceUri = (uri: string) => photoUrlMap[uri] || uri;

        // Update PrePhotos
        if (detail.prePhotos) {
          detail.prePhotos = detail.prePhotos.map((p: any) => ({
            ...p,
            url: replaceUri(p.url || p.uri),
          }));
        }
        // Update PostPhotos
        if (detail.postPhotos) {
          detail.postPhotos = detail.postPhotos.map((p: any) => ({
            ...p,
            url: replaceUri(p.url || p.uri),
          }));
        }
        // Update Item Observations
        if (detail.itemObservations) {
          Object.keys(detail.itemObservations).forEach(key => {
            const obs = detail.itemObservations[key];
            if (obs && obs.photoUrl) {
              obs.photoUrl = replaceUri(obs.photoUrl);
            }
          });
        }

        // C. Save to Supabase
        await supabaseMaintenanceService.saveMaintenanceResponse({
          id_mantenimiento: item.id_mantenimiento,
          user_created: item.user_created,
          detail_maintenance: detail,
          protocol: item.protocol ? JSON.parse(item.protocol) : null,
        } as any);

        if (item.id_mantenimiento) {
          await supabaseMaintenanceService.updateMaintenanceStatus(
            item.id_mantenimiento,
            'FINALIZADO',
          );
        }

        await DatabaseService.updateMaintenanceStatus(item.local_id, 'synced');
      } catch (error) {
        console.error(`[SYNC-MAIN] Failed for ${item.local_id}:`, error);
        await DatabaseService.updateMaintenanceStatus(
          item.local_id,
          'error',
          String(error),
        );
      }
    }
  }

  // ----------------------------------------------------------------
  // SUB-ROUTINE 2: PANELS
  // ----------------------------------------------------------------
  private async syncPendingPanelConfigs(specificPanelId?: string) {
    const pendingConfigs =
      (await DatabaseService.getPendingPanelConfigurations()) as any[];

    // Filter if looking for a specific one (from handler) or all
    const configsToSync = specificPanelId
      ? pendingConfigs.filter(c => c.panel_id === specificPanelId)
      : pendingConfigs;

    if (configsToSync.length === 0) return;

    console.log(`[SYNC-PANEL] Syncing ${configsToSync.length} configs`);

    for (const config of configsToSync) {
      try {
        await DatabaseService.updatePanelConfigurationStatus(
          config.id,
          'syncing',
        );
        const detail = JSON.parse(config.configuration_data);

        await supabaseElectricalPanelService.updateEquipmentDetail(
          config.panel_id,
          detail,
        );

        await DatabaseService.updatePanelConfigurationStatus(
          config.id,
          'synced',
        );
      } catch (error) {
        console.error(`[SYNC-PANEL] Failed for ${config.id}:`, error);
        await DatabaseService.updatePanelConfigurationStatus(
          config.id,
          'error',
          String(error),
        );
      }
    }
  }

  // ----------------------------------------------------------------
  // SUB-ROUTINE 3: GROUNDING WELLS
  // ----------------------------------------------------------------
  private async syncPendingGroundingWells() {
    const pendingChecklists =
      (await DatabaseService.getPendingGroundingWellChecklists()) as any[];
    if (pendingChecklists.length === 0) return;

    console.log(`[SYNC-GROUND] Syncing ${pendingChecklists.length} checklists`);

    for (const checklist of pendingChecklists) {
      try {
        await DatabaseService.updateGroundingWellChecklistStatus(
          checklist.local_id,
          'syncing',
        );

        // A. Upload Photos
        const photos =
          (await DatabaseService.getPendingGroundingWellChecklistPhotos(
            checklist.local_id,
          )) as { id: number; local_uri: string; item_key: string }[];
        const photoUrlMap: Record<string, string> = {};

        for (const photo of photos) {
          const remoteUrl = await supabaseMaintenanceService.uploadPhoto(
            photo.local_uri,
            'grounding-well',
          );
          await DatabaseService.updateGroundingWellChecklistPhotoStatus(
            photo.id,
            'synced',
            remoteUrl,
          );
          photoUrlMap[photo.local_uri] = remoteUrl;
        }

        // B. Replace URLs in JSON
        const detail = JSON.parse(checklist.checklist_data);
        const replaceUri = (uri: string) => photoUrlMap[uri] || uri;

        if (detail.lidStatusPhoto)
          detail.lidStatusPhoto = replaceUri(detail.lidStatusPhoto);
        ['hasSignage', 'connectorsOk', 'hasAccess'].forEach(key => {
          if (detail[key]?.photo)
            detail[key].photo = replaceUri(detail[key].photo);
        });

        // C. Save
        await supabaseGroundingWellService.saveChecklistResponse(
          checklist.panel_id,
          checklist.maintenance_id,
          detail,
          checklist.user_created,
        );

        await DatabaseService.updateGroundingWellChecklistStatus(
          checklist.local_id,
          'synced',
        );
      } catch (error) {
        console.error(`[SYNC-GROUND] Failed for ${checklist.local_id}:`, error);
        await DatabaseService.updateGroundingWellChecklistStatus(
          checklist.local_id,
          'error',
          String(error),
        );
      }
    }
  }

  // ----------------------------------------------------------------
  // PULL DATA
  // ----------------------------------------------------------------
  async pullData(): Promise<boolean> {
    await DatabaseService.ensureInitialized();
    if (this.currentSyncPromise) return this.currentSyncPromise;
    if (!this.isConnected) return false;

    this.isSyncing = true;
    this.currentSyncPromise = (async () => {
      try {
        console.log('Starting Down-Sync...');

        // Execute promises in parallel for better network speed
        const [
          equipos,
          properties,
          instrumentos,
          equipamentos,
          equipamentosProperty,
          scheduledMaintenances,
        ] = await Promise.all([
          supabase
            .from('equipos')
            .select('*')
            .then(r => r.data),
          supabase
            .from('properties')
            .select('*')
            .then(r => r.data),
          supabase
            .from('instrumentos')
            .select('*')
            .then(r => r.data),
          supabase
            .from('equipamentos')
            .select('*')
            .then(r => r.data),
          supabase
            .from('equipamentos_property')
            .select('*')
            .then(r => r.data),
          supabase
            .from('mantenimientos')
            .select(
              `
                id, dia_programado, tipo_mantenimiento, observations, estatus, codigo, id_equipo,
                user_maintenace ( id_user )
             `,
            )
            .order('dia_programado', { ascending: true })
            .then(r => r.data),
        ]);

        await DatabaseService.bulkInsertMirrorData(
          equipos || [],
          properties || [],
          [],
          instrumentos || [],
          equipamentos || [],
          equipamentosProperty || [],
          scheduledMaintenances || [],
        );

        console.log('Down-Sync Completed.');
        return true;
      } catch (error) {
        console.error('Down-Sync Error:', error);
        return false;
      } finally {
        this.isSyncing = false;
        this.currentSyncPromise = null;
      }
    })();

    return this.currentSyncPromise;
  }
}

export const syncService = new SyncService();
