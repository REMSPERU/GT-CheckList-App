import { dbPromise, withLock, ensureInitialized } from './connection';

export async function saveOfflinePanelConfiguration(
  panelId: string,
  configurationData: any,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const jsonConfig = JSON.stringify(configurationData);
    await db.withTransactionAsync(async () => {
      // 1. Queue configuration for sync
      await db.runAsync(
        `INSERT INTO offline_panel_configurations (panel_id, configuration_data, status)
         VALUES (?, ?, 'pending')`,
        [panelId, jsonConfig],
      );

      // 2. Update local mirror immediately aka "optimistic update"
      // This ensures the user sees the panel as configured even if offline
      const updateResult = await db.runAsync(
        `UPDATE local_equipos
         SET equipment_detail = ?, config = 1, last_synced_at = ?
         WHERE id = ?`,
        [jsonConfig, new Date().toISOString(), panelId],
      );

      if (updateResult.changes === 0) {
        console.warn(
          '⚠️ [DB] No rows updated! Panel ID might not exist in local_equipos:',
          panelId,
        );
      }
    });
  });
}

export async function getPendingPanelConfigurations() {
  await ensureInitialized();
  const db = await dbPromise;
  return await db.getAllAsync(`
    SELECT * FROM offline_panel_configurations WHERE status = 'pending' OR status = 'error'
  `);
}

export async function updatePanelConfigurationStatus(
  id: number,
  status: string,
  errorMessage: string | null = null,
) {
  await ensureInitialized();
  const db = await dbPromise;
  const now = status === 'synced' ? new Date().toISOString() : null;
  await db.runAsync(
    `UPDATE offline_panel_configurations SET status = ?, error_message = ?, synced_at = ? WHERE id = ?`,
    [status, errorMessage, now, id],
  );
}
