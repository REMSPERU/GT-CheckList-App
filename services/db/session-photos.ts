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
      const existingRows = await db.getAllAsync<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM offline_sesion_fotos
         WHERE id_sesion = ? AND status != 'error'`,
        [sessionId],
      );

      const existingCount = Number(existingRows?.[0]?.count || 0);
      if (existingCount >= 2) {
        return;
      }

      const remainingSlots = 2 - existingCount;
      const photosToInsert = photoUris
        .map(uri => uri.trim())
        .filter(uri => uri.length > 0)
        .slice(0, remainingSlots);

      for (const uri of photosToInsert) {
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
  return withLock(async () => {
    const db = await dbPromise;

    const mirrorCountRows = await db.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM local_sesion_fotos
       WHERE id_sesion = ?`,
      [sessionId],
    );
    const mirrorCount = Number(mirrorCountRows?.[0]?.count || 0);

    const offlineCountRows = await db.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM offline_sesion_fotos
       WHERE id_sesion = ? AND status != 'error'`,
      [sessionId],
    );
    const offlineCount = Number(offlineCountRows?.[0]?.count || 0);

    return mirrorCount + offlineCount >= 2;
  });
}

/**
 * Get pending session photos for sync.
 */
export async function getPendingSessionPhotos() {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      `SELECT * FROM offline_sesion_fotos WHERE status = 'pending' OR status = 'error'`,
    );
  });
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
  return withLock(async () => {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE offline_sesion_fotos SET status = ?, remote_url = ?, error_message = ? WHERE id = ?`,
      [status, remoteUrl, errorMessage, id],
    );
  });
}

/**
 * Get session photos from local mirror (for display).
 */
export async function getLocalSessionPhotos(sessionId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      'SELECT * FROM local_sesion_fotos WHERE id_sesion = ? ORDER BY created_at ASC',
      [sessionId],
    );
  });
}
