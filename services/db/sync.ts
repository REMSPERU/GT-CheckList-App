import { dbPromise, withLock, ensureInitialized } from './connection';

interface LocalSessionUpsertInput {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fecha_programada?: string | null;
  estatus?: string | null;
  id_property?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

interface LocalScheduledMaintenanceUpsertInput {
  id: string;
  dia_programado: string;
  tipo_mantenimiento: string;
  observations?: string | null;
  id_equipo: string;
  estatus: string;
  codigo?: string | null;
  id_sesion?: string | null;
}

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
    DELETE FROM local_user_properties;
    DELETE FROM local_equipamentos;
    DELETE FROM local_preguntas_equipamento;
    DELETE FROM local_audit_questions;
    DELETE FROM local_equipamentos_property;
    DELETE FROM offline_panel_configurations;
  `);
}

/** Batch size for INSERT OR REPLACE operations */
const INSERT_BATCH_SIZE = 50;

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

  // 4. Upsert all remote data in batches (INSERT OR REPLACE handles updates)
  for (let i = 0; i < remoteData.length; i += INSERT_BATCH_SIZE) {
    const batch = remoteData.slice(i, i + INSERT_BATCH_SIZE);
    for (const item of batch) {
      await db.runAsync(insertQuery, paramsFn(item));
    }
  }
}

/**
 * Bulk insert/update mirror data using smart sync strategy.
 * This performs differential updates instead of clearing all data first,
 * which prevents UI flicker during synchronization.
 *
 * Parameters that are `null` are SKIPPED — local data is preserved.
 * This prevents accidental data wipes when a Supabase query fails.
 * An empty array `[]` means "the remote table is truly empty" and will clear local data.
 */
export async function bulkInsertMirrorData(
  equipos: any[] | null,
  properties: any[] | null,
  users: any[] | null,
  userProperties: any[] | null = [],
  instrumentos: any[] | null = [],
  equipamentos: any[] | null = [],
  perguntasEquipamento: any[] | null = [],
  auditQuestions: any[] | null = [],
  equipamentosProperty: any[] | null = [],
  scheduledMaintenances: any[] | null = [],
  sessions: any[] | null = [],
  userSessions: any[] | null = [],
  sessionPhotos: any[] | null = [],
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;

    await db.withTransactionAsync(async () => {
      // --- Smart Sync for Equipos (skip if null = fetch failed) ---
      if (equipos !== null) {
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
      }

      // --- Smart Sync for Properties ---
      if (properties !== null) {
        await smartSyncTable(
          db,
          'local_properties',
          properties,
          'id',
          'INSERT OR REPLACE INTO local_properties (id, name, code, address, city, image_url) VALUES (?, ?, ?, ?, ?, ?)',
          item => [
            item.id,
            item.name,
            item.code,
            item.address || '',
            item.city || '',
            item.image_url || null,
          ],
        );
      }

      // --- Smart Sync for Users ---
      if (users !== null) {
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
      }

      // --- Smart Sync for User Properties Assignments ---
      if (userProperties !== null) {
        await smartSyncTable(
          db,
          'local_user_properties',
          userProperties,
          'id',
          'INSERT OR REPLACE INTO local_user_properties (id, user_id, property_id, property_role, expires_at, assigned_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          item => [
            item.id,
            item.user_id,
            item.property_id,
            item.property_role || null,
            item.expires_at || null,
            item.assigned_at || null,
            item.updated_at || null,
          ],
        );
      }

      // --- Smart Sync for Instrumentos ---
      if (instrumentos !== null) {
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
      }

      // --- Smart Sync for Equipamentos (Catalog) ---
      if (equipamentos !== null) {
        await smartSyncTable(
          db,
          'local_equipamentos',
          equipamentos,
          'id',
          'INSERT OR REPLACE INTO local_equipamentos (id, nombre, abreviatura, frecuencia) VALUES (?, ?, ?, ?)',
          item => [item.id, item.nombre, item.abreviatura, item.frecuencia],
        );
      }

      // --- Smart Sync for Preguntas Equipamento ---
      if (perguntasEquipamento !== null) {
        await smartSyncTable(
          db,
          'local_preguntas_equipamento',
          perguntasEquipamento,
          'id',
          'INSERT OR REPLACE INTO local_preguntas_equipamento (id, equipamento_id, pregunta, orden, activa, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          item => [
            item.id,
            item.equipamento_id,
            item.pregunta,
            item.orden,
            item.activa ? 1 : 0,
            item.created_at,
            item.updated_at,
          ],
        );
      }

      // --- Smart Sync for Audit Questions ---
      if (auditQuestions !== null) {
        await smartSyncTable(
          db,
          'local_audit_questions',
          auditQuestions,
          'id',
          'INSERT OR REPLACE INTO local_audit_questions (id, question_code, question_text, order_index, section_id, section_name, section_order_index, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          item => [
            item.id,
            item.question_code,
            item.question_text,
            item.order_index,
            item.section_id || null,
            item.section?.section_name || null,
            item.section?.order_index || null,
            item.is_active ? 1 : 0,
            item.updated_at || null,
          ],
        );
      }

      // --- Equipamentos Property (Composite Key - Full Replace) ---
      if (equipamentosProperty !== null) {
        await db.runAsync('DELETE FROM local_equipamentos_property');
        for (
          let i = 0;
          i < equipamentosProperty.length;
          i += INSERT_BATCH_SIZE
        ) {
          const batch = equipamentosProperty.slice(i, i + INSERT_BATCH_SIZE);
          for (const item of batch) {
            await db.runAsync(
              'INSERT INTO local_equipamentos_property (id_equipamentos, id_property) VALUES (?, ?)',
              [item.id_equipamentos, item.id_property],
            );
          }
        }
      }

      // --- Smart Sync for Scheduled Maintenances ---
      if (scheduledMaintenances !== null) {
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
              item.user_sesion_mantenimiento?.map((um: any) => um.id_user) ||
                [],
            ),
            new Date().toISOString(),
          ],
        );
      }

      // --- Smart Sync for Sesion Mantenimiento ---
      if (sessions !== null) {
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
            item.estatus || 'NO_INICIADO',
            item.id_property || null,
            item.created_by || null,
            item.created_at || null,
            new Date().toISOString(),
          ],
        );
      }

      // --- User Sesion Mantenimiento (Composite Key - Full Replace) ---
      if (userSessions !== null) {
        await db.runAsync('DELETE FROM local_user_sesion_mantenimiento');
        for (let i = 0; i < userSessions.length; i += INSERT_BATCH_SIZE) {
          const batch = userSessions.slice(i, i + INSERT_BATCH_SIZE);
          for (const item of batch) {
            await db.runAsync(
              'INSERT OR REPLACE INTO local_user_sesion_mantenimiento (id_user, id_sesion) VALUES (?, ?)',
              [item.id_user, item.id_sesion],
            );
          }
        }
      }

      // --- Smart Sync for Session Photos ---
      if (sessionPhotos !== null) {
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
      }
    });

    console.log('[SmartSync] Mirror data sync completed');
  });
}

/**
 * Upsert a newly created maintenance session + maintenances in local mirror tables.
 * This allows immediate UI visibility without waiting for periodic pull sync.
 */
export async function upsertCreatedMaintenanceLocally(
  session: LocalSessionUpsertInput,
  maintenances: LocalScheduledMaintenanceUpsertInput[],
  assignedTechnicians: string[] = [],
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT OR REPLACE INTO local_sesion_mantenimiento (id, nombre, descripcion, fecha_programada, estatus, id_property, created_by, created_at, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          session.id,
          session.nombre,
          session.descripcion || null,
          session.fecha_programada || null,
          session.estatus || 'NO_INICIADO',
          session.id_property || null,
          session.created_by || null,
          session.created_at || null,
          new Date().toISOString(),
        ],
      );

      for (const item of maintenances) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_scheduled_maintenances (id, dia_programado, tipo_mantenimiento, observations, id_equipo, estatus, codigo, id_sesion, assigned_technicians, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            item.id,
            item.dia_programado,
            item.tipo_mantenimiento,
            item.observations || null,
            item.id_equipo,
            item.estatus,
            item.codigo || null,
            item.id_sesion || null,
            JSON.stringify(assignedTechnicians),
            new Date().toISOString(),
          ],
        );
      }

      await db.runAsync(
        'DELETE FROM local_user_sesion_mantenimiento WHERE id_sesion = ?',
        [session.id],
      );

      for (const userId of assignedTechnicians) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_user_sesion_mantenimiento (id_user, id_sesion) VALUES (?, ?)',
          [userId, session.id],
        );
      }
    });
  });
}

/**
 * Cleanup synced rows from offline queue tables to keep SQLite lean over time.
 * Keeps pending/error rows for retries and user visibility.
 */
export async function cleanupOfflineQueue() {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;

    await db.withTransactionAsync(async () => {
      await db.runAsync(`
        DELETE FROM offline_photos
        WHERE status = 'synced'
      `);

      await db.runAsync(`
        DELETE FROM offline_sesion_fotos
        WHERE status = 'synced'
      `);

      await db.runAsync(`
        DELETE FROM offline_panel_configurations
        WHERE status = 'synced'
      `);

      await db.runAsync(`
        DELETE FROM offline_audit_sessions
        WHERE sync_status = 'synced'
      `);
    });
  });
}
