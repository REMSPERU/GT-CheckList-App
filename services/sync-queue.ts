import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type SyncItemType = 'panel_config' | 'maintenance' | 'photo';
export type SyncStatus =
  | 'pending'
  | 'syncing'
  | 'error'
  | 'fatal_error'
  | 'synced';

export interface SyncQueueItem {
  id: string;
  itemId: string; // The actual panel/maintenance ID
  type: SyncItemType;
  status: SyncStatus;
  retryCount: number;
  lastAttempt: Date | null;
  nextRetry: Date | null;
  errorMessage: string | null;
}

// Exponential backoff delays in milliseconds
const RETRY_DELAYS = [10000, 30000, 60000, 120000]; // 10s, 30s, 60s, 2min
const MAX_AUTO_RETRIES = 3;

type SyncHandler = (itemId: string) => Promise<void>;

class SyncQueueService {
  private queue: Map<string, SyncQueueItem> = new Map();
  private handlers: Map<SyncItemType, SyncHandler> = new Map();
  private isProcessing = false;
  private retryTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private netInfoUnsubscribe: (() => void) | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    // Listen for network changes to trigger sync on reconnect
    this.netInfoUnsubscribe = NetInfo.addEventListener(
      (state: NetInfoState) => {
        if (state.isConnected) {
          console.log('[SYNC-QUEUE] Network connected, processing queue...');
          this.processQueue();
        }
      },
    );
  }

  /**
   * Register a handler for a specific sync type
   */
  registerHandler(type: SyncItemType, handler: SyncHandler) {
    this.handlers.set(type, handler);
  }

  /**
   * Add an item to the sync queue
   */
  enqueue(itemId: string, type: SyncItemType): SyncQueueItem {
    const id = `${type}_${itemId}`;

    // If already in queue, return existing item
    const existing = this.queue.get(id);
    if (existing && existing.status !== 'synced') {
      return existing;
    }

    const item: SyncQueueItem = {
      id,
      itemId,
      type,
      status: 'pending',
      retryCount: 0,
      lastAttempt: null,
      nextRetry: null,
      errorMessage: null,
    };

    this.queue.set(id, item);
    this.notifyListeners();

    // Trigger processing
    this.processQueue();

    return item;
  }

  /**
   * Get status for a specific item
   */
  getStatus(itemId: string, type: SyncItemType): SyncStatus | null {
    const id = `${type}_${itemId}`;
    const item = this.queue.get(id);
    return item?.status ?? null;
  }

  /**
   * Get all statuses for a specific type
   */
  getStatusMap(type: SyncItemType): Record<string, SyncStatus> {
    const result: Record<string, SyncStatus> = {};
    this.queue.forEach((item, _key) => {
      if (item.type === type) {
        result[item.itemId] = item.status;
      }
    });
    return result;
  }

  /**
   * Manual retry for a specific item (user-triggered)
   */
  async retryItem(itemId: string, type: SyncItemType): Promise<boolean> {
    const id = `${type}_${itemId}`;
    const item = this.queue.get(id);

    if (!item) {
      console.log('[SYNC-QUEUE] Item not found for retry:', id);
      return false;
    }

    // Reset retry count for manual retry
    item.retryCount = 0;
    item.status = 'pending';
    item.nextRetry = null;
    this.notifyListeners();

    return this.processItem(item);
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Process all pending items in the queue
   */
  private async processQueue() {
    if (this.isProcessing) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[SYNC-QUEUE] No network, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingItems = Array.from(this.queue.values()).filter(
        item =>
          item.status === 'pending' ||
          (item.status === 'error' &&
            item.retryCount < MAX_AUTO_RETRIES &&
            (!item.nextRetry || new Date() >= item.nextRetry)),
      );

      for (const item of pendingItems) {
        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: SyncQueueItem): Promise<boolean> {
    const handler = this.handlers.get(item.type);
    if (!handler) {
      console.error('[SYNC-QUEUE] No handler registered for type:', item.type);
      return false;
    }

    item.status = 'syncing';
    item.lastAttempt = new Date();
    this.notifyListeners();

    try {
      await handler(item.itemId);

      // Success!
      item.status = 'synced';
      item.errorMessage = null;
      item.nextRetry = null;
      this.notifyListeners();

      console.log('[SYNC-QUEUE] Item synced successfully:', item.id);
      return true;
    } catch (error: any) {
      console.error('[SYNC-QUEUE] Sync failed for item:', item.id, error);

      item.retryCount++;
      item.errorMessage = error?.message || 'Unknown error';

      // Check if it's a fatal error (client error, not network)
      const isFatalError =
        error?.status === 400 ||
        error?.status === 401 ||
        error?.status === 403 ||
        error?.status === 404 ||
        error?.message?.includes('invalid') ||
        error?.message?.includes('Invalid');

      if (isFatalError) {
        item.status = 'fatal_error';
        item.nextRetry = null;
        console.log('[SYNC-QUEUE] Fatal error, will not retry:', item.id);
      } else if (item.retryCount >= MAX_AUTO_RETRIES) {
        item.status = 'error';
        item.nextRetry = null;
        console.log('[SYNC-QUEUE] Max retries reached:', item.id);
      } else {
        // Schedule next retry with exponential backoff
        const delay =
          RETRY_DELAYS[Math.min(item.retryCount - 1, RETRY_DELAYS.length - 1)];
        item.status = 'error';
        item.nextRetry = new Date(Date.now() + delay);

        console.log(
          `[SYNC-QUEUE] Scheduling retry ${item.retryCount}/${MAX_AUTO_RETRIES} in ${delay / 1000}s for:`,
          item.id,
        );

        // Clear existing timeout if any
        const existingTimeout = this.retryTimeouts.get(item.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Schedule the retry
        const timeout = setTimeout(() => {
          this.retryTimeouts.delete(item.id);
          this.processQueue();
        }, delay);

        this.retryTimeouts.set(item.id, timeout);
      }

      this.notifyListeners();
      return false;
    }
  }

  /**
   * Check if an item should show "Retrying..." (auto-retry pending)
   */
  isAutoRetrying(itemId: string, type: SyncItemType): boolean {
    const id = `${type}_${itemId}`;
    const item = this.queue.get(id);
    return (
      item?.status === 'error' &&
      item.retryCount < MAX_AUTO_RETRIES &&
      item.nextRetry !== null
    );
  }

  /**
   * Check if an item needs manual retry (max retries exceeded)
   */
  needsManualRetry(itemId: string, type: SyncItemType): boolean {
    const id = `${type}_${itemId}`;
    const item = this.queue.get(id);
    return (
      (item?.status === 'error' && item.retryCount >= MAX_AUTO_RETRIES) ||
      item?.status === 'fatal_error'
    );
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    this.listeners.clear();
  }
}

export const syncQueue = new SyncQueueService();
