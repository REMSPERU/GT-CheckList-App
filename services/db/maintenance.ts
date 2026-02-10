import { dbPromise, withLock, ensureInitialized } from './connection';

export async function saveOfflineMaintenance(
  userId: string,
  maintenanceId: string | null,
  detailMaintenance: any,
  photos: {
    uri: string;
    type: string;
    category?: string;
    observationKey?: string;
  }[],
  protocol?: any,
) {
  return withLock(async () => {
    const db = await dbPromise;
    let localId: number | null = null;

    await db.withTransactionAsync(async () => {
      // 1. Insert Maintenance Record
      const result = await db.runAsync(
        `INSERT INTO offline_maintenance_response (id_mantenimiento, user_created, detail_maintenance, protocol, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [
          maintenanceId,
          userId,
          JSON.stringify(detailMaintenance),
          protocol ? JSON.stringify(protocol) : null,
        ],
      );
      localId = result.lastInsertRowId;

      // 2. Insert Photos
      for (const photo of photos) {
        await db.runAsync(
          `INSERT INTO offline_photos (maintenance_local_id, local_uri, type, category, observation_key, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [
            localId,
            photo.uri,
            photo.type,
            photo.category || null,
            photo.observationKey || null,
          ],
        );
      }
    });

    return localId;
  });
}

export async function getPendingMaintenances() {
  await ensureInitialized();
  const db = await dbPromise;
  // Get headers
  const rows = await db.getAllAsync(`
    SELECT * FROM offline_maintenance_response WHERE status = 'pending' OR status = 'error'
  `);

  return rows;
}

export async function updateMaintenanceStatus(
  localId: number,
  status: string,
  errorMessage: string | null = null,
) {
  await ensureInitialized();
  const db = await dbPromise;
  const now = status === 'synced' ? new Date().toISOString() : null;
  await db.runAsync(
    `UPDATE offline_maintenance_response SET status = ?, error_message = ?, synced_at = ? WHERE local_id = ?`,
    [status, errorMessage, now, localId],
  );
}
