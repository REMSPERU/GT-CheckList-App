import { supabase } from '@/lib/supabase';
import { DatabaseService } from './db';
import { supabaseMaintenanceService } from './supabase-maintenance.service';
import { supabaseElectricalPanelService } from './supabase-electrical-panel.service';
import { supabaseGroundingWellService } from './supabase-grounding-well.service';
import { supabaseAuditStorageService } from './supabase-audit-storage.service';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue } from './sync-queue';

interface NetworkState {
  isConnected: boolean | null;
}

// --- Constants ---
/** Maximum rows fetched per table to prevent OOM on mobile devices */
const SYNC_ROW_LIMIT = 5000;

/** Minimum interval between pull syncs to prevent rapid successive downloads */
const MIN_PULL_INTERVAL_MS = 30000;

/** Polling interval for background sync checks */
const POLL_INTERVAL_MS = 30000;

const log = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

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
  type: 'pre' | 'post' | 'observation' | 'session';
  category?: string;
  observation_key?: string;
  status: string;
}

interface OfflineSessionPhoto {
  id: number;
  id_sesion: string;
  local_uri: string;
  tipo: string;
  created_by: string;
  status: string;
}

interface OfflineAuditSession {
  local_id: number;
  client_submission_id: string;
  property_id: string;
  auditor_id: string;
  created_by: string | null;
  scheduled_for: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  audit_payload: string | null;
  summary: string | null;
  sync_status: string;
}

interface AuditPhotoPayload {
  url?: string;
  path?: string;
  bucket?: string;
}

interface AuditAnswerPayload {
  question_id?: string;
  status?: string;
  photos?: AuditPhotoPayload[];
}

interface AuditPayload {
  version?: number;
  answers?: AuditAnswerPayload[];
}

interface MaintenanceRouteContext {
  id: string;
  id_equipo: string | null;
  id_sesion: string | null;
}

/**
 * Helper to safely fetch data from a Supabase table with a row limit.
 * Returns { data, failed } — when the query errors, data is null and failed is true.
 * This prevents silent data wipes in smartSyncTable.
 */
async function safeFetch<T = any>(
  queryFn: () => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<{ data: T[] | null; failed: boolean }> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      console.error('[SYNC] Supabase query error:', error.message || error);
      return { data: null, failed: true };
    }
    return { data: data ?? [], failed: false };
  } catch (err) {
    console.error('[SYNC] Supabase query exception:', err);
    return { data: null, failed: true };
  }
}

// --- Class Definition ---
class SyncService {
  private isConnected = false;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private isPushing = false;
  private currentPushPromise: Promise<void> | null = null;
  private currentSyncPromise: Promise<boolean> | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;
  private initialized = false;
  private lastPullTimestamp = 0;

  constructor() {
    // Intentionally empty — do NOT start timers or network listeners here.
    // Call start() explicitly after DatabaseService.initDatabase() resolves.
  }

  /**
   * Start the sync service. Must be called AFTER DatabaseService.initDatabase() resolves.
   */
  async start() {
    if (this.initialized) return;
    this.initialized = true;

    await DatabaseService.ensureInitialized();
    this.registerSyncHandlers();
    this.initListeners();
  }

  private initListeners() {
    // Initial check
    this.checkNetworkAndMaybeSync();

    // Polling safety check
    this.pollIntervalId = setInterval(() => {
      this.checkNetworkAndMaybeSync();
    }, POLL_INTERVAL_MS);

    // Network event listener
    this.netInfoUnsubscribe = NetInfo.addEventListener(
      (state: NetworkState) => {
        const wasConnected = this.isConnected;
        this.isConnected = state.isConnected ?? false;
        if (this.isConnected && !wasConnected) {
          this.syncOnReconnect();
        }
      },
    );
  }

  cleanup() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.initialized = false;
    this.isConnected = false;
  }

  private registerSyncHandlers() {
    if (typeof syncQueue !== 'undefined') {
      syncQueue.registerHandler('panel_config', async (panelId: string) => {
        console.log('[SYNC-HANDLER] Triggered for:', panelId);
        await this.pushData();
      });
    }
  }

  private async checkNetworkAndMaybeSync() {
    try {
      const state = await NetInfo.fetch();
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;

      if (this.isConnected && !wasConnected) {
        this.syncOnReconnect();
      }
    } catch (err) {
      console.error('[SYNC] Network check failed:', err);
    }
  }

  private async syncOnReconnect() {
    if (this.isSyncing) return;
    log('Auto-sync triggered on reconnect...');
    try {
      await this.pushData(); // Upload local changes
      await this.pullData(); // Download new data
      log('Auto-sync completed');
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }

  /**
   * MAIN UPLOAD ORCHESTRATOR
   * Executes sub-tasks sequentially. Uses a mutex to prevent duplicate uploads.
   */
  async pushData() {
    await DatabaseService.ensureInitialized();
    if (this.currentPushPromise) return this.currentPushPromise;

    this.currentPushPromise = (async () => {
      if (this.isPushing) return;
      this.isPushing = true;

      try {
        const state = await NetInfo.fetch();
        this.isConnected = state.isConnected ?? false;
        if (!this.isConnected || state.isInternetReachable === false) return;

        log('[SYNC] Starting Batch Upload...');

        // 1. Sync Maintenances
        await this.syncPendingMaintenances();

        // 2. Sync Panel Configurations
        await this.syncPendingPanelConfigs();

        // 3. Sync Grounding Wells
        await this.syncPendingGroundingWells();

        // 4. Sync Session Photos
        await this.syncPendingSessionPhotos();

        // 5. Sync Audit Sessions
        await this.syncPendingAuditSessions();

        try {
          await DatabaseService.cleanupOfflineQueue();
        } catch (cleanupError) {
          console.warn('[SYNC] Offline queue cleanup failed:', cleanupError);
        }

        log('[SYNC] Batch Upload Finished.');
      } finally {
        this.isPushing = false;
      }
    })();

    try {
      await this.currentPushPromise;
    } finally {
      this.currentPushPromise = null;
    }
  }

  // ----------------------------------------------------------------
  // SUB-ROUTINE 5: AUDIT SESSIONS
  // ----------------------------------------------------------------
  private async syncPendingAuditSessions() {
    const pendingItems =
      (await DatabaseService.getPendingAuditSessions()) as OfflineAuditSession[];

    if (pendingItems.length === 0) return;

    log(`[SYNC-AUDIT] Found ${pendingItems.length} pending sessions`);

    for (const item of pendingItems) {
      try {
        await DatabaseService.updateOfflineAuditSessionStatus(
          item.local_id,
          'syncing',
        );

        const payload = item.audit_payload
          ? (JSON.parse(item.audit_payload) as AuditPayload)
          : null;
        const summary = item.summary ? JSON.parse(item.summary) : {};

        if (payload?.answers?.length) {
          for (const answer of payload.answers) {
            if (answer.status !== 'OBS' || !answer.photos?.length) continue;

            const uploadedPhotos: AuditPhotoPayload[] = [];

            for (const photo of answer.photos) {
              const sourceUri = photo.url || photo.path;
              if (!sourceUri) continue;

              if (
                sourceUri.startsWith('http://') ||
                sourceUri.startsWith('https://')
              ) {
                uploadedPhotos.push(photo);
                continue;
              }

              const uploaded = await supabaseAuditStorageService.uploadPhoto({
                uri: sourceUri,
                clientSubmissionId: item.client_submission_id,
                propertyId: item.property_id,
                auditorId: item.auditor_id,
                questionId: answer.question_id,
              });

              uploadedPhotos.push({
                bucket: uploaded.bucket,
                path: uploaded.path,
                url: uploaded.publicUrl,
              });
            }

            answer.photos = uploadedPhotos;
          }
        }

        const { error } = await supabase.from('audit_sessions').upsert(
          {
            client_submission_id: item.client_submission_id,
            property_id: item.property_id,
            auditor_id: item.auditor_id,
            created_by: item.created_by || item.auditor_id,
            scheduled_for: item.scheduled_for,
            status: item.status,
            started_at: item.started_at,
            submitted_at: item.submitted_at,
            audit_payload: payload,
            summary,
          },
          { onConflict: 'client_submission_id' },
        );

        if (error) throw error;

        await DatabaseService.updateOfflineAuditSessionStatus(
          item.local_id,
          'synced',
        );
      } catch (error) {
        const message = this.getAuditSyncErrorMessage(error);
        await DatabaseService.updateOfflineAuditSessionStatus(
          item.local_id,
          'error',
          message,
        );
        console.error('[SYNC-AUDIT] Session sync error:', error);
      }
    }
  }

  private getAuditSyncErrorMessage(error: unknown): string {
    const rawMessage =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error ?? '');

    const normalized = rawMessage.toLowerCase();

    if (
      normalized.includes('row-level security') ||
      normalized.includes('permission denied') ||
      normalized.includes('42501')
    ) {
      return 'No autorizado: verifique rol AUDITOR y asignacion del inmueble.';
    }

    if (normalized.includes('violates check constraint')) {
      return 'Datos invalidos en auditoria (OBS requiere comentario y foto).';
    }

    if (normalized.includes('network') || normalized.includes('fetch')) {
      return 'Sin internet: la auditoria quedo pendiente para reintento automatico.';
    }

    if (normalized.includes('storage')) {
      return 'No se pudo subir evidencia fotografica a storage.';
    }

    return rawMessage || 'Error desconocido al sincronizar auditoria.';
  }

  // ----------------------------------------------------------------
  // SUB-ROUTINE 1: MAINTENANCES
  // ----------------------------------------------------------------
  private async syncPendingMaintenances() {
    const pendingItems =
      (await DatabaseService.getPendingMaintenances()) as OfflineMaintenance[];
    if (pendingItems.length === 0) return;

    log(`[SYNC-MAIN] Found ${pendingItems.length} pending items`);

    for (const item of pendingItems) {
      try {
        await DatabaseService.updateMaintenanceStatus(item.local_id, 'syncing');

        let routeContext: MaintenanceRouteContext | null = null;
        if (item.id_mantenimiento) {
          routeContext =
            (await DatabaseService.getLocalScheduledMaintenanceById(
              item.id_mantenimiento,
            )) as MaintenanceRouteContext | null;
        }

        // A. Upload Photos
        const photos = (await DatabaseService.getPendingPhotos(
          item.local_id,
        )) as OfflinePhoto[];
        const photoUrlMap: Record<string, string> = {};

        for (const photo of photos) {
          try {
            const remoteUrl = await supabaseMaintenanceService.uploadPhoto(
              photo.local_uri,
              {
                sessionId: routeContext?.id_sesion || null,
                equipmentId: routeContext?.id_equipo || null,
                maintenanceId:
                  item.id_mantenimiento || `offline-${item.local_id}`,
                category:
                  photo.type === 'pre'
                    ? 'pre'
                    : photo.type === 'post'
                      ? 'post'
                      : photo.type === 'session'
                        ? 'session-start'
                        : 'observation',
                observationKey: photo.observation_key || null,
              },
            );
            log(`[SYNC] Photo ${photo.id} uploaded: ${remoteUrl}`);

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

    log(`[SYNC-PANEL] Syncing ${configsToSync.length} configs`);

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

    log(`[SYNC-GROUND] Syncing ${pendingChecklists.length} checklists`);

    for (const checklist of pendingChecklists) {
      try {
        await DatabaseService.updateGroundingWellChecklistStatus(
          checklist.local_id,
          'syncing',
        );

        let routeContext: MaintenanceRouteContext | null = null;
        if (checklist.maintenance_id) {
          routeContext =
            (await DatabaseService.getLocalScheduledMaintenanceById(
              checklist.maintenance_id,
            )) as MaintenanceRouteContext | null;
        }

        // A. Upload Photos
        const photos =
          (await DatabaseService.getPendingGroundingWellChecklistPhotos(
            checklist.local_id,
          )) as { id: number; local_uri: string; item_key: string }[];
        const photoUrlMap: Record<string, string> = {};
        const photoItemMap: Record<string, string> = {};

        for (const photo of photos) {
          const remoteUrl = await supabaseMaintenanceService.uploadPhoto(
            photo.local_uri,
            {
              sessionId: routeContext?.id_sesion || null,
              equipmentId:
                checklist.panel_id || routeContext?.id_equipo || null,
              maintenanceId:
                checklist.maintenance_id ||
                `grounding-offline-${checklist.local_id}`,
              category: 'grounding-well',
              itemKey: photo.item_key,
            },
          );
          await DatabaseService.updateGroundingWellChecklistPhotoStatus(
            photo.id,
            'synced',
            remoteUrl,
          );
          photoUrlMap[photo.local_uri] = remoteUrl;
          photoItemMap[photo.item_key] = remoteUrl;
        }

        // B. Replace URLs in JSON
        const detail = JSON.parse(checklist.checklist_data);
        const replaceUri = (uri: string) => photoUrlMap[uri] || uri;

        const directPhotoFieldMap: Record<string, string> = {
          preMeasurement: 'preMeasurementPhoto',
          greaseApplication: 'greaseApplicationPhoto',
          thorGel: 'thorGelPhoto',
          postMeasurement: 'postMeasurementPhoto',
          lidStatus: 'lidStatusPhoto',
        };

        Object.entries(directPhotoFieldMap).forEach(
          ([itemKey, detailField]) => {
            if (photoItemMap[itemKey]) {
              detail[detailField] = photoItemMap[itemKey];
            } else if (detail[detailField]) {
              detail[detailField] = replaceUri(detail[detailField]);
            }
          },
        );

        [
          'wellMeasurement',
          'hasSignage',
          'wellLabeling',
          'connectorsOk',
          'hasAccess',
        ].forEach(key => {
          if (photoItemMap[key]) {
            if (!detail[key]) detail[key] = { value: true, observation: '' };
            detail[key].photo = photoItemMap[key];
          } else if (detail[key]?.photo) {
            detail[key].photo = replaceUri(detail[key].photo);
          }
        });

        // C. Save
        await supabaseGroundingWellService.saveChecklistResponse(
          checklist.maintenance_id,
          detail,
          checklist.user_created,
        );

        // D. Update maintenance status to FINALIZADO in Supabase
        if (checklist.maintenance_id) {
          await supabaseMaintenanceService.updateMaintenanceStatus(
            checklist.maintenance_id,
            'FINALIZADO',
          );
        }

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
  // SUB-ROUTINE 4: SESSION PHOTOS
  // ----------------------------------------------------------------
  private async syncPendingSessionPhotos() {
    const pendingPhotos =
      (await DatabaseService.getPendingSessionPhotos()) as OfflineSessionPhoto[];
    if (pendingPhotos.length === 0) return;

    log(
      `[SYNC-SESSION-PHOTO] Found ${pendingPhotos.length} pending session photos`,
    );

    for (const photo of pendingPhotos) {
      try {
        await DatabaseService.updateSessionPhotoStatus(photo.id, 'syncing');

        // 1. Upload to Storage
        const remoteUrl = await supabaseMaintenanceService.uploadPhoto(
          photo.local_uri,
          {
            sessionId: photo.id_sesion,
            category: 'session-start',
          },
        );
        log(`[SYNC-SESSION-PHOTO] Photo ${photo.id} uploaded: ${remoteUrl}`);

        // 2. Insert into Supabase table
        const { error } = await supabase
          .from('sesion_mantenimiento_fotos')
          .insert({
            id_sesion: photo.id_sesion,
            foto_url: remoteUrl,
            tipo: photo.tipo || 'inicio',
            created_by: photo.created_by,
          });

        if (error) {
          console.error('[SYNC-SESSION-PHOTO] Supabase insert error:', error);
          throw error;
        }

        // 3. Mark as synced
        await DatabaseService.updateSessionPhotoStatus(
          photo.id,
          'synced',
          remoteUrl,
        );
      } catch (error) {
        console.error(`[SYNC-SESSION-PHOTO] Failed for ${photo.id}:`, error);
        await DatabaseService.updateSessionPhotoStatus(
          photo.id,
          'error',
          null,
          String(error),
        );
      }
    }
  }

  // ----------------------------------------------------------------
  // PULL DATA — with limits and error checking
  // ----------------------------------------------------------------
  async pullData(force = false): Promise<boolean> {
    await DatabaseService.ensureInitialized();
    if (this.currentPushPromise) {
      await this.currentPushPromise;
    }
    if (this.currentSyncPromise) return this.currentSyncPromise;

    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;
    if (!this.isConnected || state.isInternetReachable === false) return false;

    // Throttle: skip if last pull was less than MIN_PULL_INTERVAL_MS ago
    const now = Date.now();
    if (!force && now - this.lastPullTimestamp < MIN_PULL_INTERVAL_MS) {
      log('[SYNC] Pull throttled — too soon since last pull');
      return true;
    }

    this.isSyncing = true;
    this.currentSyncPromise = (async () => {
      try {
        log('Starting Down-Sync...');

        const localSession = await DatabaseService.getSession();
        const currentUserId = localSession?.user_id || null;

        // Fetch all tables in parallel WITH limits and error checking
        const [
          equiposResult,
          propertiesResult,
          userPropertiesResult,
          instrumentosResult,
          equipamentosResult,
          preguntasEquipamentoResult,
          auditQuestionsResult,
          equipamentosPropertyResult,
          scheduledMaintenancesResult,
          sessionsResult,
          userSessionsResult,
          sessionPhotosResult,
        ] = await Promise.all([
          safeFetch(() =>
            supabase.from('equipos').select('*').limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase.from('properties').select('*').limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() => {
            let query = supabase
              .from('user_properties')
              .select('*')
              .limit(SYNC_ROW_LIMIT);

            if (currentUserId) {
              query = query.eq('user_id', currentUserId);
            }

            return query;
          }),
          safeFetch(() =>
            supabase.from('instrumentos').select('*').limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase.from('equipamentos').select('*').limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase
              .from('preguntas_equipamento')
              .select('*')
              .eq('activa', true)
              .limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase
              .from('audit_questions')
              .select('*')
              .eq('is_active', true)
              .order('order_index', { ascending: true })
              .limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase
              .from('equipamentos_property')
              .select('*')
              .limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase
              .from('mantenimientos')
              .select(
                `id, dia_programado, tipo_mantenimiento, observations, estatus, codigo, id_equipo, id_sesion`,
              )
              .order('dia_programado', { ascending: true })
              .limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase
              .from('sesion_mantenimiento')
              .select('*')
              .limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase
              .from('user_sesion_mantenimiento')
              .select('id_user, id_sesion')
              .limit(SYNC_ROW_LIMIT),
          ),
          safeFetch(() =>
            supabase
              .from('sesion_mantenimiento_fotos')
              .select('*')
              .limit(SYNC_ROW_LIMIT),
          ),
        ]);

        // Log any failures (but continue syncing successful tables)
        const failedTables: string[] = [];
        if (equiposResult.failed) failedTables.push('equipos');
        if (propertiesResult.failed) failedTables.push('properties');
        if (userPropertiesResult.failed) failedTables.push('user_properties');
        if (instrumentosResult.failed) failedTables.push('instrumentos');
        if (equipamentosResult.failed) failedTables.push('equipamentos');
        if (preguntasEquipamentoResult.failed)
          failedTables.push('preguntas_equipamento');
        if (auditQuestionsResult.failed) failedTables.push('audit_questions');
        if (equipamentosPropertyResult.failed)
          failedTables.push('equipamentos_property');
        if (scheduledMaintenancesResult.failed)
          failedTables.push('mantenimientos');
        if (sessionsResult.failed) failedTables.push('sesion_mantenimiento');
        if (userSessionsResult.failed)
          failedTables.push('user_sesion_mantenimiento');
        if (sessionPhotosResult.failed)
          failedTables.push('sesion_mantenimiento_fotos');

        if (failedTables.length > 0) {
          console.warn(
            `[SYNC] ${failedTables.length} table(s) failed to fetch: ${failedTables.join(', ')}. Local data preserved for failed tables.`,
          );
        }

        // Pass null for failed tables — bulkInsertMirrorData will skip them
        await DatabaseService.bulkInsertMirrorData(
          equiposResult.data,
          propertiesResult.data,
          null, // users — not fetched in pull
          userPropertiesResult.data,
          instrumentosResult.data,
          equipamentosResult.data,
          preguntasEquipamentoResult.data,
          auditQuestionsResult.data,
          equipamentosPropertyResult.data,
          scheduledMaintenancesResult.data,
          sessionsResult.data,
          userSessionsResult.data,
          sessionPhotosResult.data,
        );

        this.lastPullTimestamp = Date.now();
        log('Down-Sync Completed.');
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
