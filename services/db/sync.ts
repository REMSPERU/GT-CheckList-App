import { dbPromise, withLock, ensureInitialized } from './connection';

/**
 * @deprecated Use smartSync instead. This clears all data causing UI flicker.
 */
export async function clearMirrorTables() {
  await ensureInitialized();
  const db = await dbPromise;
  await db.execAsync(`
    DELETE FROM local_equipos;
    DELETE FROM local_properties;
    DELETE FROM local_users;
    DELETE FROM local_equipamentos;
    DELETE FROM local_equipamentos_property;
    DELETE FROM offline_panel_configurations;
  `);
}

/**
 * Smart sync helper that performs differential updates.
 * Only deletes records that no longer exist remotely, then upserts the rest.
 * This prevents UI flicker during sync.
 */
async function smartSyncTable<T extends { id?: string }>(
  db: any,
  tableName: string,
  remoteData: T[],
  pkField: string,
  insertQuery: string,
  paramsFn: (item: T) => any[],
) {
  if (remoteData.length === 0) {
    // If no remote data, clear the table
    await db.runAsync(`DELETE FROM ${tableName}`);
    return;
  }

  // 1. Get all local IDs
  const localRows = (await db.getAllAsync(
    `SELECT ${pkField} as pk FROM ${tableName}`,
  )) as { pk: string }[];
  const localIds = new Set(localRows.map((r: { pk: string }) => r.pk));
  const remoteIds = new Set(
    remoteData.map((r: any) => String((r as any)[pkField])),
  );

  // 2. Identify records to delete (exist locally but not remotely)
  const toDelete = [...localIds].filter((id: string) => !remoteIds.has(id));

  // 3. Delete removed records in batches (SQLite has limits on IN clause)
  if (toDelete.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');
      await db.runAsync(
        `DELETE FROM ${tableName} WHERE ${pkField} IN (${placeholders})`,
        batch,
      );
    }
    console.log(
      `[SmartSync] Deleted ${toDelete.length} records from ${tableName}`,
    );
  }

  // 4. Upsert all remote data (INSERT OR REPLACE handles updates)
  for (const item of remoteData) {
    await db.runAsync(insertQuery, paramsFn(item));
  }
}

/**
 * Bulk insert/update mirror data using smart sync strategy.
 * This performs differential updates instead of clearing all data first,
 * which prevents UI flicker during synchronization.
 */
/**
 * Bulk insert/update mirror data using smart sync strategy.
 * This performs differential updates instead of clearing all data first,
 * which prevents UI flicker during synchronization.
 */
export async function bulkInsertMirrorData(
  equipos: any[],
  properties: any[],
  users: any[],
  instrumentos: any[] = [],
  equipamentos: any[] = [],
  equipamentosProperty: any[] = [],
  scheduledMaintenances: any[] = [],
  sessions: any[] = [],
  userSessions: any[] = [],
  sessionPhotos: any[] = [],
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;

    await db.withTransactionAsync(async () => {
      // --- Smart Sync for Equipos ---
      await smartSyncTable(
        db,
        'local_equipos',
        equipos,
        'id',
        'INSERT OR REPLACE INTO local_equipos (id, id_property, id_equipamento, codigo, ubicacion, detalle_ubicacion, estatus, equipment_detail, config, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.id_property,
          item.id_equipamento,
          item.codigo,
          item.ubicacion,
          item.detalle_ubicacion,
          item.estatus,
          JSON.stringify(item.equipment_detail),
          item.config ? 1 : 0,
          new Date().toISOString(),
        ],
      );

      // --- Smart Sync for Properties ---
      await smartSyncTable(
        db,
        'local_properties',
        properties,
        'id',
        'INSERT OR REPLACE INTO local_properties (id, name, code, address, city) VALUES (?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.name,
          item.code,
          item.address || '',
          item.city || '',
        ],
      );

      // --- Smart Sync for Users ---
      await smartSyncTable(
        db,
        'local_users',
        users,
        'id',
        'INSERT OR REPLACE INTO local_users (id, username, email, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.username,
          item.email,
          item.first_name,
          item.last_name,
        ],
      );

      // --- Smart Sync for Instrumentos ---
      await smartSyncTable(
        db,
        'local_instrumentos',
        instrumentos,
        'id',
        'INSERT OR REPLACE INTO local_instrumentos (id, instrumento, marca, modelo, serie, equipamento) VALUES (?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.instrumento,
          item.marca,
          item.modelo,
          item.serie,
          item.equipamento,
        ],
      );

      // --- Smart Sync for Equipamentos (Catalog) ---
      await smartSyncTable(
        db,
        'local_equipamentos',
        equipamentos,
        'id',
        'INSERT OR REPLACE INTO local_equipamentos (id, nombre, abreviatura) VALUES (?, ?, ?)',
        item => [item.id, item.nombre, item.abreviatura],
      );

      // --- Equipamentos Property (Composite Key - Full Replace) ---
      // For junction tables with composite keys, it's simpler and fast enough
      // to clear and re-insert within the same transaction
      await db.runAsync('DELETE FROM local_equipamentos_property');
      for (const item of equipamentosProperty) {
        await db.runAsync(
          'INSERT INTO local_equipamentos_property (id_equipamentos, id_property) VALUES (?, ?)',
          [item.id_equipamentos, item.id_property],
        );
      }

      // --- Smart Sync for Scheduled Maintenances ---
      await smartSyncTable(
        db,
        'local_scheduled_maintenances',
        scheduledMaintenances,
        'id',
        'INSERT OR REPLACE INTO local_scheduled_maintenances (id, dia_programado, tipo_mantenimiento, observations, id_equipo, estatus, codigo, id_sesion, assigned_technicians, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.dia_programado,
          item.tipo_mantenimiento,
          item.observations,
          item.id_equipo,
          item.estatus,
          item.codigo,
          item.id_sesion || null,
          JSON.stringify(
            item.user_sesion_mantenimiento?.map((um: any) => um.id_user) || [],
          ),
          new Date().toISOString(),
        ],
      );

      // --- Smart Sync for Sesion Mantenimiento ---
      await smartSyncTable(
        db,
        'local_sesion_mantenimiento',
        sessions,
        'id',
        'INSERT OR REPLACE INTO local_sesion_mantenimiento (id, nombre, descripcion, fecha_programada, estatus, id_property, created_by, created_at, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.nombre,
          item.descripcion || null,
          item.fecha_programada || null,
          item.estatus || 'NO INICIADO',
          item.id_property || null,
          item.created_by || null,
          item.created_at || null,
          new Date().toISOString(),
        ],
      );

      // --- User Sesion Mantenimiento (Composite Key - Full Replace) ---
      await db.runAsync('DELETE FROM local_user_sesion_mantenimiento');
      for (const item of userSessions) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_user_sesion_mantenimiento (id_user, id_sesion) VALUES (?, ?)',
          [item.id_user, item.id_sesion],
        );
      }

      // --- Smart Sync for Session Photos ---
      await smartSyncTable(
        db,
        'local_sesion_fotos',
        sessionPhotos,
        'id',
        'INSERT OR REPLACE INTO local_sesion_fotos (id, id_sesion, foto_url, tipo, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.id_sesion,
          item.foto_url,
          item.tipo || 'inicio',
          item.created_by || null,
          item.created_at || null,
        ],
      );
    });

    console.log('[SmartSync] Mirror data sync completed');
  });
}
