import { supabase } from '@/lib/supabase';
import { DatabaseService } from './db';
import { supabaseMaintenanceService } from './supabase-maintenance.service';
import { supabaseElectricalPanelService } from './supabase-electrical-panel.service';
import { supabaseGroundingWellService } from './supabase-grounding-well.service';
import { supabaseAuditStorageService } from './supabase-audit-storage.service';
import { checklistStorageService } from './checklist-storage.service';
import NetInfo from '@react-native-community/netinfo';
import { syncQueue } from './sync-queue';

interface NetworkState {
  isConnected: boolean | null;
}

// --- Constants ---
/** Maximum rows fetched per table to prevent OOM on mobile devices */
const SYNC_ROW_LIMIT = 5000;

/** Minimum interval between full pull syncs to avoid reloading data on navigation */
const MIN_PULL_INTERVAL_MS = 5 * 60 * 1000;

/** Polling interval for background sync checks */
const POLL_INTERVAL_MS = 30000;

const AUDIT_PHOTO_UPLOAD_TIMEOUT_MS = 60000;
const AUDIT_SESSION_UPSERT_TIMEOUT_MS = 45000;

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

interface OfflineChecklistResponse {
  local_id: number;
  client_submission_id: string;
  building_id: string;
  equipamento_id: string;
  equipo_id: string;
  frequency: string;
  period_start: string;
  period_end: string;
  user_created: string;
  payload_json: string;
  status: string;
}

interface OfflineChecklistPhoto {
  id: number;
  checklist_local_id: number;
  question_id: string | null;
  kind: 'general' | 'question';
  local_uri: string;
  status: string;
  remote_bucket: string | null;
  remote_path: string | null;
  remote_public_url: string | null;
}

interface ChecklistPhotoRefPayload {
  bucket: string;
  path: string;
  public_url: string;
}

interface ChecklistAnswerPayload {
  pregunta_id: string;
  ponderado?: number | string | null;
  fotos?: ChecklistPhotoRefPayload[];
}

interface ChecklistResponsePayload {
  evidencia_general_fotos?: ChecklistPhotoRefPayload[];
  respuestas_json?: {
    respuestas?: ChecklistAnswerPayload[];
  };
}

interface AuditPhotoPayload {
  local_uri?: string;
  path?: string;
  bucket?: string;
}

interface AuditAnswerPayload {
  question_id: string;
  status: 'OK' | 'OBS';
  comment?: string | null;
  photos?: AuditPhotoPayload[];
}

interface AuditEquipmentFeedbackPayload {
  equipment_key: string;
  equipment_label: string;
  good_practices_comment?: string | null;
  good_practices_photos?: AuditPhotoPayload[];
  improvement_opportunity_comment?: string | null;
  improvement_opportunity_photos?: AuditPhotoPayload[];
}

interface AuditPayload {
  version?: number;
  answers?: AuditAnswerPayload[];
  equipment_feedback?: AuditEquipmentFeedbackPayload[];
}

function hasUploadedAuditPhoto(photo: AuditPhotoPayload) {
  return Boolean(photo.bucket && photo.path);
}

function getAuditPhotoGroups(payload: AuditPayload | null) {
  return [
    ...(payload?.answers?.map(answer => answer.photos) ?? []),
    ...(payload?.equipment_feedback?.flatMap(feedback => [
      feedback.good_practices_photos,
      feedback.improvement_opportunity_photos,
    ]) ?? []),
  ];
}

function countAuditPhotos(payload: AuditPayload | null) {
  return getAuditPhotoGroups(payload).reduce(
    (total, photos) => total + (photos?.length ?? 0),
    0,
  );
}

function countUploadedAuditPhotos(payload: AuditPayload | null) {
  return getAuditPhotoGroups(payload).reduce((total, photos) => {
    return total + (photos?.filter(hasUploadedAuditPhoto).length ?? 0);
  }, 0);
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(errorMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

interface RemoteAuditSession {
  client_submission_id: string;
  property_id: string;
  auditor_id: string;
  created_by: string | null;
  scheduled_for: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  audit_payload: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  created_at: string | null;
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

async function fetchEquiposPaginated(): Promise<{ data: any[] | null; failed: boolean }> {
  try {
    let allEquipos: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const to = from + limit - 1;
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .range(from, to);

      if (error) {
        console.error('[SYNC] Error fetching equipos page:', error.message || error);
        return { data: null, failed: true };
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allEquipos = allEquipos.concat(data);
        if (data.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      }
    }

    return { data: allEquipos, failed: false };
  } catch (err) {
    console.error('[SYNC] Exception fetching equipos paginated:', err);
    return { data: null, failed: true };
  }
}

// --- Class Definition ---
/** Options for triggerSync calls */
export interface TriggerSyncOptions {
  /** Force pull even if within dedup window */
  force?: boolean;
  /** Only push (upload), skip pull (download) */
  pushOnly?: boolean;
}

class SyncService {
  private isConnected = false;
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private isPushing = false;
  private currentPushPromise: Promise<void> | null = null;
  private currentSyncPromise: Promise<boolean> | null = null;
  private syncOperationLock: Promise<void> = Promise.resolve();
  private netInfoUnsubscribe: (() => void) | null = null;
  private reconnectPullTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private lastPullTimestamp = 0;

  // --- Centralized sync orchestrator state ---
  /** Monotonic counter for correlating sync operations in logs */
  private syncCounter = 0;
  /** Timestamp of last completed full sync (push + pull) */
  private lastFullSyncTimestamp = 0;
  /** Timestamp of last full sync attempt, including failed pulls */
  private lastFullSyncAttemptTimestamp = 0;
  /** If a sync is requested while one is running, store ONE pending reason */
  private pendingSyncRequest: {
    reason: string;
    options?: TriggerSyncOptions;
  } | null = null;
  /** Whether a full sync cycle is currently executing */
  private isFullSyncing = false;
  /** Minimum ms between full sync attempts — prevents boot/navigation duplicates */
  private static readonly FULL_SYNC_DEDUP_MS = 60_000;
  private static readonly RECONNECT_PULL_DELAY_MS = 60_000;
  /** Initial mirror readiness state after first successful full sync */
  private _isInitialSyncDone = false;
  /** One-time listeners fired when initial sync becomes ready */
  private readyListeners: Set<() => void> = new Set();

  get isInitialSyncDone(): boolean {
    return this._isInitialSyncDone;
  }

  get isSyncActive(): boolean {
    return (
      this.isFullSyncing || this.isSyncing || this.currentSyncPromise !== null
    );
  }

  onReady(listener: () => void): () => void {
    if (this._isInitialSyncDone) {
      listener();
      return () => {};
    }

    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  private markReady() {
    if (this._isInitialSyncDone) return;
    this._isInitialSyncDone = true;
    this.readyListeners.forEach(listener => listener());
    this.readyListeners.clear();
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const candidate = error as {
        message?: string;
        error_description?: string;
        details?: string;
        hint?: string;
      };

      if (candidate.message) return candidate.message;
      if (candidate.error_description) return candidate.error_description;
      if (candidate.details) return candidate.details;
      if (candidate.hint) return candidate.hint;

      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    }

    return 'Error desconocido durante sincronizacion';
  }

  private async runSerializedSyncOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const previousOperation = this.syncOperationLock;
    let releaseLock!: () => void;

    this.syncOperationLock = new Promise(resolve => {
      releaseLock = resolve;
    });

    await previousOperation;

    try {
      return await operation();
    } finally {
      releaseLock();
    }
  }

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
    if (this.reconnectPullTimeoutId) {
      clearTimeout(this.reconnectPullTimeoutId);
      this.reconnectPullTimeoutId = null;
    }

    this.initialized = false;
    this.isConnected = false;
    this.isFullSyncing = false;
    this.pendingSyncRequest = null;
    this.lastFullSyncTimestamp = 0;
    this.lastFullSyncAttemptTimestamp = 0;
    this.syncCounter = 0;
    this._isInitialSyncDone = false;
    this.readyListeners.clear();
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
    const hasLocalMirror = await this.hasInitialMirrorForNavigation();

    if (!hasLocalMirror) {
      await this.triggerSync('reconnect-initial-pull', { force: true });
      return;
    }

    await this.triggerSync('reconnect', { pushOnly: true, force: true });

    if (this.reconnectPullTimeoutId) {
      clearTimeout(this.reconnectPullTimeoutId);
    }

    this.reconnectPullTimeoutId = setTimeout(() => {
      this.reconnectPullTimeoutId = null;
      void this.triggerSync('reconnect-background-pull');
    }, SyncService.RECONNECT_PULL_DELAY_MS);
  }

  private isPassiveSyncReason(reason: string) {
    const normalizedReason = reason.toLowerCase();

    if (
      normalizedReason.includes('refresh') ||
      normalizedReason.includes('manual') ||
      normalizedReason.includes('retry') ||
      normalizedReason.includes('save') ||
      normalizedReason.includes('submit') ||
      normalizedReason.includes('finalize') ||
      normalizedReason.includes('post-') ||
      normalizedReason === 'reconnect'
    ) {
      return false;
    }

    return (
      normalizedReason.endsWith('-focus') ||
      normalizedReason.endsWith('-mount') ||
      normalizedReason.includes('screen-mount') ||
      normalizedReason.includes('index-mount')
    );
  }

  private normalizeTriggerOptions(
    reason: string,
    options?: TriggerSyncOptions,
    hasLocalMirror = true,
  ): TriggerSyncOptions | undefined {
    if (options?.force || options?.pushOnly) {
      return options;
    }

    if (hasLocalMirror && this.isPassiveSyncReason(reason)) {
      return { ...options, pushOnly: true };
    }

    return options;
  }

  private async hasInitialMirrorForNavigation() {
    if (this._isInitialSyncDone) return true;

    try {
      return await DatabaseService.hasUsableLocalMirror();
    } catch (error) {
      console.warn('[SYNC] Failed to inspect local mirror state:', error);
      return false;
    }
  }

  private isCriticalSyncReason(reason: string) {
    const normalizedReason = reason.toLowerCase();

    return (
      normalizedReason === 'reconnect' ||
      normalizedReason.includes('manual') ||
      normalizedReason.includes('retry') ||
      normalizedReason.includes('save') ||
      normalizedReason.includes('submit') ||
      normalizedReason.includes('finalize') ||
      normalizedReason.includes('post-')
    );
  }

  private shouldReplacePendingSync(
    incomingReason: string,
    incomingOptions?: TriggerSyncOptions,
  ) {
    if (!this.pendingSyncRequest) return true;

    if (incomingOptions?.force) return true;
    if (this.pendingSyncRequest.options?.force) return false;

    const incomingPassive = this.isPassiveSyncReason(incomingReason);
    const pendingPassive = this.isPassiveSyncReason(
      this.pendingSyncRequest.reason,
    );

    if (incomingPassive && pendingPassive) return false;
    if (
      incomingOptions?.pushOnly &&
      this.pendingSyncRequest.options?.pushOnly
    ) {
      return false;
    }

    return !incomingPassive;
  }

  // ----------------------------------------------------------------
  // CENTRALIZED SYNC ORCHESTRATOR
  // All sync triggers should go through this method.
  // Provides: dedup by time window, lock (only one running), and
  // a queue of ONE pending re-run so no request is silently lost.
  // ----------------------------------------------------------------

  /**
   * Central entry point for all sync operations across the app.
   *
   * @param reason - Human-readable tag for logs (e.g. 'reconnect', 'home-mount', 'pull-to-refresh')
   * @param options - Optional overrides: { force: skip dedup, pushOnly: skip pull }
   *
   * Guarantees:
   * - Only ONE full sync runs at a time.
   * - Rapid successive calls within FULL_SYNC_DEDUP_MS are skipped (unless force).
   * - If called while syncing, ONE pending re-run is queued (latest wins).
   */
  async triggerSync(
    reason: string,
    options?: TriggerSyncOptions,
  ): Promise<void> {
    const hasLocalMirror = await this.hasInitialMirrorForNavigation();
    const normalizedOptions = this.normalizeTriggerOptions(
      reason,
      options,
      hasLocalMirror,
    );
    const force = normalizedOptions?.force ?? false;
    const pushOnly = normalizedOptions?.pushOnly ?? false;
    const now = Date.now();
    const elapsed = now - this.lastFullSyncAttemptTimestamp;

    // Queue while active before applying dedup so important writes are not lost.
    if (this.isFullSyncing) {
      if (!this.shouldReplacePendingSync(reason, normalizedOptions)) {
        log(`[SYNC] Pending kept — ignored passive reason: ${reason}`);
        return;
      }

      this.pendingSyncRequest = { reason, options: normalizedOptions };
      log(
        `[SYNC] Queued pending — reason: ${reason}${pushOnly ? ' (push-only)' : ''}`,
      );
      return;
    }

    // Dedup only full pulls; push-only writes should still be allowed.
    if (
      !force &&
      !pushOnly &&
      !this.isCriticalSyncReason(reason) &&
      elapsed < SyncService.FULL_SYNC_DEDUP_MS
    ) {
      log(
        `[SYNC] Skipped (dedup) — reason: ${reason}, last full sync attempt ${elapsed}ms ago`,
      );
      return;
    }

    await this._executeFullSync(reason, normalizedOptions);
  }

  /**
   * Internal: execute push + pull cycle with structured logging.
   * After completion, drains ONE pending request if queued.
   */
  private async _executeFullSync(
    reason: string,
    options?: TriggerSyncOptions,
  ): Promise<void> {
    this.isFullSyncing = true;
    const syncId = ++this.syncCounter;
    const startTime = Date.now();
    if (!options?.pushOnly) {
      this.lastFullSyncAttemptTimestamp = startTime;
    }

    log(
      `[SYNC#${syncId}] Start — reason: ${reason}${options?.pushOnly ? ' (push-only)' : ''}`,
    );

    try {
      await this.pushData();
      const pushDuration = Date.now() - startTime;

      const pulled = options?.pushOnly
        ? true
        : await this.pullData(options?.force);

      const totalDuration = Date.now() - startTime;
      if (pulled) {
        this.lastFullSyncTimestamp = Date.now();
      } else {
        log(`[SYNC#${syncId}] Pull skipped — not updating dedup timestamp`);
      }
      if (!options?.pushOnly && pulled) {
        this.markReady();
      }

      log(
        `[SYNC#${syncId}] Done — push: ${pushDuration}ms, total: ${totalDuration}ms, reason: ${reason}`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[SYNC#${syncId}] Failed after ${duration}ms — reason: ${reason}`,
        error,
      );
    } finally {
      this.isFullSyncing = false;
    }

    // Drain ONE queued request (latest wins)
    if (this.pendingSyncRequest) {
      const pending = this.pendingSyncRequest;
      this.pendingSyncRequest = null;
      log(`[SYNC] Draining pending request — reason: ${pending.reason}`);
      await this.triggerSync(pending.reason, pending.options);
    }
  }

  /**
   * MAIN UPLOAD ORCHESTRATOR
   * Executes sub-tasks sequentially. Uses a mutex to prevent duplicate uploads.
   */
  async pushData() {
    await DatabaseService.ensureInitialized();
    if (this.currentPushPromise) return this.currentPushPromise;

    this.currentPushPromise = this.runSerializedSyncOperation(async () => {
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

        // 6. Sync generic checklist responses
        await this.syncPendingChecklistResponses();

        try {
          await DatabaseService.cleanupOfflineQueue();
        } catch (cleanupError) {
          console.warn('[SYNC] Offline queue cleanup failed:', cleanupError);
        }

        log('[SYNC] Batch Upload Finished.');
      } finally {
        this.isPushing = false;
      }
    });

    try {
      await this.currentPushPromise;
    } finally {
      this.currentPushPromise = null;
    }
  }

  // ----------------------------------------------------------------
  // SUB-ROUTINE 6: CHECKLIST RESPONSES
  // ----------------------------------------------------------------
  private async syncPendingChecklistResponses() {
    const pendingItems =
      (await DatabaseService.getPendingChecklistResponses()) as OfflineChecklistResponse[];

    if (pendingItems.length === 0) return;

    log(`[SYNC-CHECKLIST] Syncing ${pendingItems.length} responses`);

    for (const item of pendingItems) {
      try {
        await DatabaseService.updateOfflineChecklistResponseStatus(
          item.local_id,
          'syncing',
        );

        const payload = JSON.parse(
          item.payload_json,
        ) as ChecklistResponsePayload & Record<string, unknown>;
        const photos = (await DatabaseService.getChecklistPhotosByLocalId(
          item.local_id,
        )) as OfflineChecklistPhoto[];

        const uploadedPhotos: (OfflineChecklistPhoto & {
          uploadedRef: ChecklistPhotoRefPayload;
        })[] = [];

        for (const photo of photos) {
          if (
            photo.status === 'synced' &&
            photo.remote_bucket &&
            photo.remote_path &&
            photo.remote_public_url
          ) {
            uploadedPhotos.push({
              ...photo,
              uploadedRef: {
                bucket: photo.remote_bucket,
                path: photo.remote_path,
                public_url: photo.remote_public_url,
              },
            });
            continue;
          }

          try {
            await DatabaseService.updateOfflineChecklistPhotoStatus(
              photo.id,
              'syncing',
            );
            const uploaded = await checklistStorageService.uploadPhoto({
              uri: photo.local_uri,
              userId: item.user_created,
              equipoId: item.equipo_id,
              questionId: photo.question_id || undefined,
              kind: photo.kind,
            });

            const uploadedRef = {
              bucket: uploaded.bucket,
              path: uploaded.path,
              public_url: uploaded.public_url,
            };

            await DatabaseService.updateOfflineChecklistPhotoStatus(
              photo.id,
              'synced',
              {
                bucket: uploaded.bucket,
                path: uploaded.path,
                publicUrl: uploaded.public_url,
              },
            );
            uploadedPhotos.push({ ...photo, status: 'synced', uploadedRef });
          } catch (photoError) {
            await DatabaseService.updateOfflineChecklistPhotoStatus(
              photo.id,
              'error',
              null,
              this.getErrorMessage(photoError),
            );
            throw photoError;
          }
        }

        payload.evidencia_general_fotos = uploadedPhotos
          .filter(photo => photo.kind === 'general')
          .map(photo => photo.uploadedRef);

        const questionPhotosById = uploadedPhotos.reduce<
          Record<string, ChecklistPhotoRefPayload[]>
        >((acc, photo) => {
          if (photo.kind !== 'question' || !photo.question_id) return acc;
          if (!acc[photo.question_id]) acc[photo.question_id] = [];
          acc[photo.question_id].push(photo.uploadedRef);
          return acc;
        }, {});

        payload.respuestas_json?.respuestas?.forEach(answer => {
          answer.fotos = questionPhotosById[answer.pregunta_id] ?? [];
        });

        const { error } = await supabase
          .from('checklist_response')
          .upsert(payload, {
            onConflict: 'client_submission_id',
            ignoreDuplicates: false,
          });

        if (error) throw error;

        await DatabaseService.updateOfflineChecklistResponseStatus(
          item.local_id,
          'synced',
        );
      } catch (error) {
        const message = this.getErrorMessage(error);
        const isConflict = this.isUniqueConflict(error);
        await DatabaseService.updateOfflineChecklistResponseStatus(
          item.local_id,
          isConflict ? 'conflict' : 'error',
          isConflict
            ? 'Conflicto: ya existe un checklist remoto para este equipo y periodo.'
            : message,
        );
        console.error(`[SYNC-CHECKLIST] Failed for ${item.local_id}:`, error);
      }
    }
  }

  private isUniqueConflict(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: string; message?: string };
    return (
      candidate.code === '23505' ||
      String(candidate.message || '')
        .toLowerCase()
        .includes('duplicate key')
    );
  }

  // ----------------------------------------------------------------
  // SUB-ROUTINE 5: AUDIT SESSIONS
  // ----------------------------------------------------------------
  private async persistAuditUploadProgress(
    item: OfflineAuditSession,
    payload: AuditPayload | null,
    message: string | null,
  ) {
    const totalPhotos = countAuditPhotos(payload);
    const completedPhotos = countUploadedAuditPhotos(payload);

    await DatabaseService.updateOfflineAuditSessionPayload(
      item.local_id,
      payload,
    );
    await DatabaseService.updateOfflineAuditSessionUploadProgress(
      item.local_id,
      completedPhotos,
      totalPhotos,
      message,
    );
  }

  private async syncPendingAuditSessions() {
    const pendingItems =
      (await DatabaseService.getPendingAuditSessions()) as OfflineAuditSession[];

    if (pendingItems.length === 0) return;

    log(`[SYNC-AUDIT] Found ${pendingItems.length} pending sessions`);

    for (const item of pendingItems) {
      let payload: AuditPayload | null = null;
      try {
        await DatabaseService.updateOfflineAuditSessionStatus(
          item.local_id,
          'syncing',
        );

        if (item.audit_payload) {
          try {
            payload = JSON.parse(item.audit_payload) as AuditPayload;
          } catch {
            throw new Error('AUDIT_LOCAL_PAYLOAD_INVALID');
          }
        }

        let summary: Record<string, unknown> = {};
        if (item.summary) {
          try {
            summary = JSON.parse(item.summary) as Record<string, unknown>;
          } catch {
            throw new Error('AUDIT_LOCAL_SUMMARY_INVALID');
          }
        }

        if (item.sync_status === 'syncing') {
          log(
            `[SYNC-AUDIT] Recovering stuck syncing session ${item.client_submission_id}`,
          );
        }

        await this.persistAuditUploadProgress(
          item,
          payload,
          'Preparando evidencias para subir...',
        );

        if (payload?.answers?.length) {
          for (const answer of payload.answers) {
            if (answer.status !== 'OBS' || !answer.photos?.length) continue;

            for (let index = 0; index < answer.photos.length; index += 1) {
              const photo = answer.photos[index];
              if (hasUploadedAuditPhoto(photo)) {
                answer.photos[index] = {
                  bucket: photo.bucket,
                  path: photo.path,
                };
                continue;
              }

              const sourceUri = photo.local_uri;
              if (!sourceUri) {
                continue;
              }

              await this.persistAuditUploadProgress(
                item,
                payload,
                `Subiendo evidencia ${countUploadedAuditPhotos(payload) + 1} de ${countAuditPhotos(payload)}...`,
              );

              const uploaded = await withTimeout(
                supabaseAuditStorageService.uploadPhoto({
                  uri: sourceUri,
                  clientSubmissionId: item.client_submission_id,
                  propertyId: item.property_id,
                  auditorId: item.auditor_id,
                  questionId: answer.question_id,
                }),
                AUDIT_PHOTO_UPLOAD_TIMEOUT_MS,
                'AUDIT_PHOTO_UPLOAD_TIMEOUT',
              );

              answer.photos[index] = {
                bucket: uploaded.bucket,
                path: uploaded.path,
              };

              await this.persistAuditUploadProgress(
                item,
                payload,
                `Evidencia ${countUploadedAuditPhotos(payload)} de ${countAuditPhotos(payload)} subida.`,
              );
            }
          }
        }

        if (payload?.equipment_feedback?.length) {
          for (const feedback of payload.equipment_feedback) {
            const uploadFeedbackPhotos = async (
              photos: AuditPhotoPayload[] | undefined,
              suffix: string,
            ) => {
              if (!photos?.length) return [];

              for (let index = 0; index < photos.length; index += 1) {
                const photo = photos[index];
                if (hasUploadedAuditPhoto(photo)) {
                  photos[index] = {
                    bucket: photo.bucket,
                    path: photo.path,
                  };
                  continue;
                }

                const sourceUri = photo.local_uri;
                if (!sourceUri) {
                  continue;
                }

                await this.persistAuditUploadProgress(
                  item,
                  payload,
                  `Subiendo evidencia ${countUploadedAuditPhotos(payload) + 1} de ${countAuditPhotos(payload)}...`,
                );

                const uploaded = await withTimeout(
                  supabaseAuditStorageService.uploadPhoto({
                    uri: sourceUri,
                    clientSubmissionId: item.client_submission_id,
                    propertyId: item.property_id,
                    auditorId: item.auditor_id,
                    questionId: `${feedback.equipment_key}-${suffix}`,
                  }),
                  AUDIT_PHOTO_UPLOAD_TIMEOUT_MS,
                  'AUDIT_PHOTO_UPLOAD_TIMEOUT',
                );

                photos[index] = {
                  bucket: uploaded.bucket,
                  path: uploaded.path,
                };

                await this.persistAuditUploadProgress(
                  item,
                  payload,
                  `Evidencia ${countUploadedAuditPhotos(payload)} de ${countAuditPhotos(payload)} subida.`,
                );
              }

              return photos;
            };

            feedback.good_practices_photos = await uploadFeedbackPhotos(
              feedback.good_practices_photos,
              'buenas-practicas',
            );
            feedback.improvement_opportunity_photos =
              await uploadFeedbackPhotos(
                feedback.improvement_opportunity_photos,
                'oportunidad-mejora',
              );
          }
        }

        await this.persistAuditUploadProgress(
          item,
          payload,
          'Guardando auditoria en el servidor...',
        );

        const { error } = await withTimeout(
          supabase.from('audit_sessions').upsert(
            {
              client_submission_id: item.client_submission_id,
              property_id: item.property_id,
              auditor_id: item.auditor_id,
              created_by: item.created_by || item.auditor_id,
              scheduled_for: item.scheduled_for,
              status: 'SINCRONIZADA',
              started_at: item.started_at,
              submitted_at: item.submitted_at,
              audit_payload: payload,
              summary,
            },
            {
              onConflict: 'client_submission_id',
              ignoreDuplicates: false,
            },
          ),
          AUDIT_SESSION_UPSERT_TIMEOUT_MS,
          'AUDIT_SESSION_UPSERT_TIMEOUT',
        );

        if (error) throw error;

        await DatabaseService.updateOfflineAuditSessionStatus(
          item.local_id,
          'synced',
        );
        await DatabaseService.updateOfflineAuditSessionUploadProgress(
          item.local_id,
          countAuditPhotos(payload),
          countAuditPhotos(payload),
          'Auditoria subida correctamente.',
        );
      } catch (error) {
        const message = this.getAuditSyncErrorMessage(error);
        await DatabaseService.updateOfflineAuditSessionUploadProgress(
          item.local_id,
          countUploadedAuditPhotos(payload),
          countAuditPhotos(payload),
          message,
        );
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

    if (normalized.includes('audit_photo_upload_timeout')) {
      return 'La subida de una foto tardo demasiado. Revise la conexion y reintente.';
    }

    if (normalized.includes('audit_session_upsert_timeout')) {
      return 'La conexion tardo demasiado al guardar la auditoria en el servidor. Reintente.';
    }

    if (normalized.includes('storage')) {
      return 'No se pudo subir evidencia fotografica a storage.';
    }

    if (
      normalized.includes('no such file') ||
      normalized.includes('file not found') ||
      normalized.includes('could not be read') ||
      normalized.includes('no se pudo leer')
    ) {
      return 'No se encontro una foto local. Mantenga esta app instalada y contacte soporte antes de borrar datos.';
    }

    if (normalized.includes('audit_local_payload_invalid')) {
      return 'Datos locales de auditoria invalidos. Registre una nueva auditoria.';
    }

    if (normalized.includes('audit_local_summary_invalid')) {
      return 'Resumen local de auditoria invalido. Registre una nueva auditoria.';
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
              this.getErrorMessage(pError),
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
          this.getErrorMessage(error),
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
          this.getErrorMessage(error),
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
          reprogramEvidence: 'reprogramPhoto',
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
          this.getErrorMessage(error),
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
          this.getErrorMessage(error),
        );
      }
    }
  }

  // ----------------------------------------------------------------
  // PULL DATA — with limits and error checking
  // ----------------------------------------------------------------
  async pullData(force = false): Promise<boolean> {
    await DatabaseService.ensureInitialized();
    if (this.currentSyncPromise) return this.currentSyncPromise;

    this.currentSyncPromise = this.runSerializedSyncOperation(async () => {
      try {
        const state = await NetInfo.fetch();
        this.isConnected = state.isConnected ?? false;
        if (!this.isConnected || state.isInternetReachable === false) {
          log('[SYNC] Pull skipped — offline');
          return false;
        }

        // Throttle: skip if last pull was less than MIN_PULL_INTERVAL_MS ago
        const now = Date.now();
        if (!force && now - this.lastPullTimestamp < MIN_PULL_INTERVAL_MS) {
          log('[SYNC] Pull throttled — too soon since last pull');
          return true;
        }

        this.isSyncing = true;
        log('Starting Down-Sync...');

        const localSession = await DatabaseService.getSession();
        const currentUserId = localSession?.user_id || null;
        const currentLocalUser = currentUserId
          ? await DatabaseService.getLocalUserById(currentUserId)
          : null;
        const currentRole =
          currentLocalUser &&
          typeof currentLocalUser === 'object' &&
          'role' in currentLocalUser
            ? String(
                (currentLocalUser as { role?: string }).role || '',
              ).toUpperCase()
            : '';
        const canSeeAllAuditSessions =
          currentRole === 'SUPERADMIN' || currentRole === 'SUPERVISOR';

        // Fetch all tables in parallel WITH limits and error checking
        const [
          equiposResult,
          propertiesResult,
          userPropertiesResult,
          instrumentosResult,
          sistemasResult,
          equipamentosResult,
          preguntasEquipamentoResult,
          auditQuestionsResult,
          equipamentosPropertyResult,
          scheduledMaintenancesResult,
          sessionsResult,
          userSessionsResult,
          sessionPhotosResult,
          auditSessionsResult,
        ] = await Promise.all([
          fetchEquiposPaginated(),
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
            supabase.from('sistemas').select('*').limit(SYNC_ROW_LIMIT),
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
              .select(
                'id, question_text, equipment_name, is_active, updated_at, section_id, section:audit_question_sections(id, section_name, order_index)',
              )
              .eq('is_active', true)
              .order('question_text', { ascending: true })
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
          safeFetch(() => {
            let query = supabase
              .from('audit_sessions')
              .select(
                'client_submission_id, property_id, auditor_id, created_by, scheduled_for, status, started_at, submitted_at, audit_payload, summary, created_at',
              )
              .order('created_at', { ascending: false })
              .limit(SYNC_ROW_LIMIT);

            if (currentUserId && !canSeeAllAuditSessions) {
              query = query.eq('auditor_id', currentUserId);
            }

            return query;
          }),
        ]);

        log('[SYNC] Pull table counts', {
          mantenimientos: scheduledMaintenancesResult.data?.length ?? null,
          sesion_mantenimiento: sessionsResult.data?.length ?? null,
          user_sesion_mantenimiento: userSessionsResult.data?.length ?? null,
          sesion_mantenimiento_fotos: sessionPhotosResult.data?.length ?? null,
        });

        // Log any failures (but continue syncing successful tables)
        const failedTables: string[] = [];
        if (equiposResult.failed) failedTables.push('equipos');
        if (propertiesResult.failed) failedTables.push('properties');
        if (userPropertiesResult.failed) failedTables.push('user_properties');
        if (instrumentosResult.failed) failedTables.push('instrumentos');
        if (sistemasResult.failed) failedTables.push('sistemas');
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
        if (auditSessionsResult.failed) failedTables.push('audit_sessions');

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
          sistemasResult.data,
          equipamentosResult.data,
          preguntasEquipamentoResult.data,
          auditQuestionsResult.data,
          equipamentosPropertyResult.data,
          scheduledMaintenancesResult.data,
          sessionsResult.data,
          userSessionsResult.data,
          sessionPhotosResult.data,
        );

        if (auditSessionsResult.data !== null) {
          await DatabaseService.upsertSyncedAuditSessions(
            auditSessionsResult.data as RemoteAuditSession[],
          );
        }

        this.lastPullTimestamp = Date.now();
        log('Down-Sync Completed.');
        return true;
      } catch (error) {
        console.error('Down-Sync Error:', error);
        return false;
      } finally {
        this.isSyncing = false;
      }
    });

    try {
      return await this.currentSyncPromise;
    } finally {
      this.currentSyncPromise = null;
    }
  }
}

export const syncService = new SyncService();
