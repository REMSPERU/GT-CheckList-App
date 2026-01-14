import { supabase } from '@/lib/supabase';
import { DatabaseService } from './database';
import { supabaseMaintenanceService } from './supabase-maintenance.service';
import { supabaseElectricalPanelService } from './supabase-electrical-panel.service';
import NetInfo from '@react-native-community/netinfo';

interface OfflineMaintenance {
  local_id: number;
  id_mantenimiento: string | null;
  user_created: string;
  detail_maintenance: string; // JSON string
  status: string;
}

interface OfflinePhoto {
  id: number;
  maintenance_local_id: number;
  local_uri: string;
  type: 'pre' | 'post' | 'observations';
  category?: string;
  observation_key?: string;
  status: string;
}

class SyncService {
  private isConnected = false;
  private netInfoUnsubscribe: (() => void) | null = null;

  constructor() {
    this.init();
  }

  init() {
    // Listen for network changes
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;

      console.log('Network State Change. Connected:', this.isConnected);

      if (this.isConnected && !wasConnected) {
        // Reconnected -> Trigger bidirectional sync
        this.syncOnReconnect();
      }
    });
  }

  /**
   * Cleanup method to remove listeners
   */
  cleanup() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }

  /**
   * Sync both ways when reconnecting
   */
  private async syncOnReconnect() {
    try {
      console.log('Auto-sync triggered on reconnect...');

      // 1. Push pending offline work first
      await this.pushData();

      // 2. Pull fresh data from server
      await this.pullData();

      console.log('Auto-sync completed');
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }

  /**
   * Pulls reference data from Supabase and updates local mirror tables.
   * This is a "Reset" sync for reference data.
   */
  async pullData() {
    await DatabaseService.ensureInitialized();
    try {
      if (!this.isConnected) {
        console.log('Cannot pull data: Offline');
        // We could return false here, but throwing might be better for UI feedback
        // throw new Error('No internet connection');
        // Actually, let's just log and return.
        return false;
      }

      console.log('Starting Down-Sync...');

      // 1. Fetch Data
      const { data: equipos, error: equipError } = await supabase
        .from('equipos')
        .select('*');
      if (equipError) throw equipError;

      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('*');
      if (propError) throw propError;

      // Equipamentos (Catalog)
      const { data: equipamentos, error: eqError } = await supabase
        .from('equipamentos')
        .select('*');
      if (eqError) throw eqError;

      // Equipamentos Property (Relation)
      const { data: equipamentosProperty, error: epError } = await supabase
        .from('equipamentos_property')
        .select('*');
      if (epError) throw epError;

      // 2. Update Local DB
      // We do NOT sync all users anymore for privacy/efficiency.
      // Current user is saved on login via AuthContext.
      await DatabaseService.bulkInsertMirrorData(
        equipos || [],
        properties || [],
        [], // Empty users array
        equipamentos || [],
        equipamentosProperty || [],
      );

      console.log('Down-Sync Completed: Data mirrored locally.');
      return true;
    } catch (error) {
      console.error('Down-Sync Error:', error);
      throw error;
    }
  }

  /**
   * Pushes pending offline work to Supabase.
   */
  async pushData() {
    await DatabaseService.ensureInitialized();

    if (!this.isConnected) {
      return;
    }

    const pendingItems =
      (await DatabaseService.getPendingMaintenances()) as OfflineMaintenance[];

    console.log(`[SYNC] Found ${pendingItems.length} pending maintenances`);

    // Process maintenances if any exist (but don't return early anymore!)
    if (pendingItems.length > 0) {
      console.log(`Processing ${pendingItems.length} maintenances...`);

      for (const item of pendingItems) {
        try {
          await DatabaseService.updateMaintenanceStatus(
            item.local_id,
            'syncing',
          );

          // 1. Upload Photos first
          const photos = (await DatabaseService.getPendingPhotos(
            item.local_id,
          )) as OfflinePhoto[];
          const photoUrlMap: Record<string, string> = {}; // localUri -> remoteUrl

          for (const photo of photos) {
            try {
              // Determine folder based on type
              const folder =
                photo.type === 'pre'
                  ? 'pre'
                  : photo.type === 'post'
                    ? 'post'
                    : 'observations';

              const remoteUrl = await supabaseMaintenanceService.uploadPhoto(
                photo.local_uri,
                folder,
              );

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

          // 2. Reconstruct detail_maintenance with remote URLs
          const detail = JSON.parse(item.detail_maintenance);

          // Helper to replace URIs
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

          // 3. Insert into Supabase
          await supabaseMaintenanceService.saveMaintenanceResponse({
            id_mantenimiento: item.id_mantenimiento,
            user_created: item.user_created,
            detail_maintenance: detail,
          });

          // 3.5 Update maintenance status to FINALIZADO if it has an associated maintenance record
          if (item.id_mantenimiento) {
            await supabaseMaintenanceService.updateMaintenanceStatus(
              item.id_mantenimiento,
              'FINALIZADO',
            );
            console.log(
              `Maintenance ${item.id_mantenimiento} status updated to FINALIZADO`,
            );
          }

          // 4. Mark Synced
          await DatabaseService.updateMaintenanceStatus(
            item.local_id,
            'synced',
          );
          console.log(`Maintenance ${item.local_id} synced successfully.`);
        } catch (error) {
          console.error(`Sync failed for maintenance ${item.local_id}:`, error);
          await DatabaseService.updateMaintenanceStatus(
            item.local_id,
            'error',
            String(error),
          );
        }
      }
    } // Close the if (pendingItems.length > 0) block

    // --- SYNC PANEL CONFIGURATIONS ---
    console.log('[SYNC] Checking for pending panel configurations...');
    const pendingConfigs =
      (await DatabaseService.getPendingPanelConfigurations()) as {
        id: number;
        panel_id: string;
        configuration_data: string;
      }[];

    if (pendingConfigs.length > 0) {
      for (const config of pendingConfigs) {
        console.log(
          '[SYNC] Processing config ID:',
          config.id,
          'for panel:',
          config.panel_id,
        );
        try {
          await DatabaseService.updatePanelConfigurationStatus(
            config.id,
            'syncing',
          );

          const detail = JSON.parse(config.configuration_data);
          console.log('[SYNC] Parsed detail:', JSON.stringify(detail, null, 2));

          // Update in Supabase
          console.log(
            '[SYNC] Calling supabaseElectricalPanelService.updateEquipmentDetail...',
          );
          await supabaseElectricalPanelService.updateEquipmentDetail(
            config.panel_id,
            detail,
          );
          console.log(
            '[SYNC] Supabase update completed for panel:',
            config.panel_id,
          );

          await DatabaseService.updatePanelConfigurationStatus(
            config.id,
            'synced',
          );
          console.log(`[SYNC] Panel config ${config.id} marked as synced.`);
        } catch (error) {
          console.error(
            `[SYNC] Sync failed for panel config ${config.id}:`,
            error,
          );
          await DatabaseService.updatePanelConfigurationStatus(
            config.id,
            'error',
            String(error),
          );
        }
      }
    } else {
      console.log('[SYNC] No pending panel configurations to sync.');
    }
  }
}

export const syncService = new SyncService();
