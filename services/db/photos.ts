import { dbPromise, ensureInitialized } from './connection';

export async function getPendingPhotos(maintenanceLocalId: number) {
  await ensureInitialized();
  const db = await dbPromise;
  const rows = await db.getAllAsync(
    `
    SELECT * FROM offline_photos WHERE maintenance_local_id = ? AND status != 'synced'
  `,
    [maintenanceLocalId],
  );
  return rows;
}

export async function updatePhotoStatus(
  photoId: number,
  status: string,
  remoteUrl: string | null = null,
  errorMessage: string | null = null,
) {
  await ensureInitialized();
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE offline_photos SET status = ?, remote_url = ?, error_message = ? WHERE id = ?`,
    [status, remoteUrl, errorMessage, photoId],
  );
}
