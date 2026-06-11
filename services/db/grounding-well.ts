import { dbPromise, withLock, ensureInitialized } from './connection';

export async function saveOfflineGroundingWellChecklist(
  panelId: string,
  maintenanceId: string | null,
  checklistData: any,
  userId: string,
  photos: { uri: string; itemKey: string }[],
) {
  return withLock(async () => {
    const db = await dbPromise;
    let localId: number | null = null;

    await db.withTransactionAsync(async () => {
      // 1. Insert Checklist Record
      const result = await db.runAsync(
        `INSERT INTO offline_grounding_well_checklist (panel_id, maintenance_id, checklist_data, user_created, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [panelId, maintenanceId, JSON.stringify(checklistData), userId],
      );
      localId = result.lastInsertRowId;

      // 2. Insert Photos
      for (const photo of photos) {
        await db.runAsync(
          `INSERT INTO offline_grounding_well_photos (checklist_local_id, item_key, local_uri, status)
           VALUES (?, ?, ?, 'pending')`,
          [localId, photo.itemKey, photo.uri],
        );
      }
    });

    return localId;
  });
}

export async function getPendingGroundingWellChecklists() {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const rows = await db.getAllAsync(`
      SELECT * FROM offline_grounding_well_checklist WHERE status = 'pending' OR status = 'error'
    `);

    return rows;
  });
}

export async function getPendingGroundingWellChecklistPhotos(
  checklistLocalId: number,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const rows = await db.getAllAsync(
      `
      SELECT * FROM offline_grounding_well_photos WHERE checklist_local_id = ? AND status = 'pending'`,
      [checklistLocalId],
    );
    return rows;
  });
}

export async function updateGroundingWellChecklistStatus(
  localId: number,
  status: string,
  errorMessage: string | null = null,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const now = status === 'synced' ? new Date().toISOString() : null;
    await db.runAsync(
      `UPDATE offline_grounding_well_checklist SET status = ?, error_message = ?, synced_at = ? WHERE local_id = ?`,
      [status, errorMessage, now, localId],
    );
  });
}

export async function updateGroundingWellChecklistPhotoStatus(
  photoId: number,
  status: string,
  remoteUrl: string | null = null,
  errorMessage: string | null = null,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE offline_grounding_well_photos SET status = ?, remote_url = ?, error_message = ? WHERE id = ?`,
      [status, remoteUrl, errorMessage, photoId],
    );
  });
}

export async function getGroundingWellChecklistByLocalId(localId: number) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    return await db.getFirstAsync(
      `SELECT local_id, status, error_message, synced_at
       FROM offline_grounding_well_checklist
       WHERE local_id = ?
       LIMIT 1`,
      [localId],
    );
  });
}

export async function getLatestOfflineGroundingWellChecklistByMaintenanceId(
  maintenanceId: string,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    return await db.getFirstAsync(
      `SELECT local_id, maintenance_id, panel_id, user_created, checklist_data, status, error_message, created_at, synced_at
       FROM offline_grounding_well_checklist
       WHERE maintenance_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [maintenanceId],
    );
  });
}

export async function getGroundingWellChecklistPhotosByLocalId(
  localId: number,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    return await db.getAllAsync(
      `SELECT id, item_key, local_uri, remote_url, status
       FROM offline_grounding_well_photos
       WHERE checklist_local_id = ?`,
      [localId],
    );
  });
}

export async function getLatestOfflineGroundingWellChecklistByPanelId(
  panelId: string,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    return await db.getFirstAsync(
      `SELECT local_id, maintenance_id, panel_id, user_created, checklist_data, status, error_message, created_at, synced_at
       FROM offline_grounding_well_checklist
       WHERE panel_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [panelId],
    );
  });
}
