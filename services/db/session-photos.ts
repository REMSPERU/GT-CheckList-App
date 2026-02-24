import { dbPromise, withLock, ensureInitialized } from './connection';

/**
 * Save session photos offline for later sync.
 */
export async function saveOfflineSessionPhotos(
  sessionId: string,
  photoUris: string[],
  userId: string,
): Promise<void> {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      for (const uri of photoUris) {
        await db.runAsync(
          `INSERT INTO offline_sesion_fotos (id_sesion, local_uri, tipo, created_by, status)
           VALUES (?, ?, 'inicio', ?, 'pending')`,
          [sessionId, uri, userId],
        );
      }
    });
  });
}

/**
 * Check if a session already has photos (either local mirror or offline pending).
 */
export async function sessionHasPhotos(sessionId: string): Promise<boolean> {
  await ensureInitialized();
  const db = await dbPromise;

  // Check local mirror (already synced from server)
  const mirrorRows = await db.getAllAsync(
    'SELECT id FROM local_sesion_fotos WHERE id_sesion = ? LIMIT 1',
    [sessionId],
  );
  if (mirrorRows && mirrorRows.length > 0) return true;

  // Check offline queue (pending upload)
  const offlineRows = await db.getAllAsync(
    `SELECT id FROM offline_sesion_fotos WHERE id_sesion = ? AND status != 'error' LIMIT 1`,
    [sessionId],
  );
  if (offlineRows && offlineRows.length > 0) return true;

  return false;
}

/**
 * Get pending session photos for sync.
 */
export async function getPendingSessionPhotos() {
  await ensureInitialized();
  const db = await dbPromise;
  return await db.getAllAsync(
    `SELECT * FROM offline_sesion_fotos WHERE status = 'pending' OR status = 'error'`,
  );
}

/**
 * Update the status of an offline session photo.
 */
export async function updateSessionPhotoStatus(
  id: number,
  status: string,
  remoteUrl: string | null = null,
  errorMessage: string | null = null,
): Promise<void> {
  await ensureInitialized();
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE offline_sesion_fotos SET status = ?, remote_url = ?, error_message = ? WHERE id = ?`,
    [status, remoteUrl, errorMessage, id],
  );
}

/**
 * Get session photos from local mirror (for display).
 */
export async function getLocalSessionPhotos(sessionId: string) {
  await ensureInitialized();
  const db = await dbPromise;
  return await db.getAllAsync(
    'SELECT * FROM local_sesion_fotos WHERE id_sesion = ? ORDER BY created_at ASC',
    [sessionId],
  );
}
