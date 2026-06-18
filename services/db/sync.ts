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
    DELETE FROM local_sistemas;
    DELETE FROM local_equipamentos;
    DELETE FROM local_preguntas_equipamento;
    DELETE FROM local_audit_questions;
    DELETE FROM local_equipamentos_property;
    DELETE FROM offline_panel_configurations;
  `);
}

export async function hasUsableLocalMirror() {
  await ensureInitialized();
  const db = await dbPromise;

  const row = await db.getFirstAsync<{
    properties_count: number;
    equipos_count: number;
    equipamentos_count: number;
    equipamentos_property_count: number;
    audit_questions_count: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM local_properties) as properties_count,
      (SELECT COUNT(*) FROM local_equipos) as equipos_count,
      (SELECT COUNT(*) FROM local_equipamentos) as equipamentos_count,
      (SELECT COUNT(*) FROM local_equipamentos_property) as equipamentos_property_count,
      (SELECT COUNT(*) FROM local_audit_questions) as audit_questions_count
  `);

  if (!row) return false;

  return (
    row.properties_count > 0 ||
    row.equipos_count > 0 ||
    row.equipamentos_count > 0 ||
    row.equipamentos_property_count > 0 ||
    row.audit_questions_count > 0
  );
}

/** Batch size for INSERT OR REPLACE operations */
const INSERT_BATCH_SIZE = 50;

/**
 * Executes a batched insert using a dynamically constructed multi-row VALUES clause.
 * This reduces bridge calls and avoids SQLite lock contention.
 */
async function executeBatchInsert<T>(
  db: any,
  insertQuery: string,
  batch: T[],
  paramsFn: (item: T) => any[],
) {
  if (batch.length === 0) return;

  const valuesIndex = insertQuery.toLowerCase().indexOf('values');
  if (valuesIndex === -1) {
    // Fallback if no VALUES keyword found
    for (const item of batch) {
      await db.runAsync(insertQuery, paramsFn(item));
    }
    return;
  }

  const baseQuery = insertQuery.substring(0, valuesIndex).trim();
  const valuesPart = insertQuery.substring(valuesIndex).trim();

  const openParen = valuesPart.indexOf('(');
  const closeParen = valuesPart.lastIndexOf(')');
  if (openParen === -1 || closeParen === -1) {
    // Fallback if parentheses structure not found
    for (const item of batch) {
      await db.runAsync(insertQuery, paramsFn(item));
    }
    return;
  }

  const singleRowPlaceholders = valuesPart.substring(openParen, closeParen + 1);
  const batchPlaceholders = Array(batch.length)
    .fill(singleRowPlaceholders)
    .join(', ');
  const finalQuery = `${baseQuery} VALUES ${batchPlaceholders}`;

  const flatParams: any[] = [];
  for (const item of batch) {
    flatParams.push(...paramsFn(item));
  }

  await db.runAsync(finalQuery, flatParams);
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
  const startedAt = Date.now();

  if (remoteData.length === 0) {
    // If no remote data, clear the table
    await db.runAsync(`DELETE FROM ${tableName}`);
    if (__DEV__) {
      console.log('[SmartSync] table done', {
        tableName,
        remoteCount: remoteData.length,
        elapsedMs: Date.now() - startedAt,
      });
    }
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
    await executeBatchInsert(db, insertQuery, batch, paramsFn);
  }

  const elapsedMs = Date.now() - startedAt;
  if (__DEV__ && elapsedMs > 500) {
    console.log('[SmartSync] table done', {
      tableName,
      remoteCount: remoteData.length,
      elapsedMs,
    });
  }
}

async function runMirrorStep(
  label: string,
  operation: (db: any) => Promise<void>,
) {
  await withLock(
    async () => {
      const db = await dbPromise;
      console.log(`[DEBUG] runMirrorStep (${label}) db before tx:`, db, typeof db);
      await db.withTransactionAsync(async () => {
        console.log(`[DEBUG] runMirrorStep (${label}) db inside tx:`, db, typeof db);
        await operation(db);
      });
    },
    `bulkInsertMirrorData:${label}`,
    { maxRetries: 0 },
  );
}

async function replaceCompositeRows<T>(
  tx: any,
  tableName: string,
  rows: T[],
  insertQuery: string,
  paramsFn: (item: T) => any[],
) {
  await tx.runAsync(`DELETE FROM ${tableName}`);

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    await executeBatchInsert(tx, insertQuery, batch, paramsFn);
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
  sistemas: any[] | null = [],
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

  if (equipos !== null) {
    await runMirrorStep('local_equipos', tx =>
      smartSyncTable(
        tx,
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
      ),
    );
  }

  if (properties !== null) {
    await runMirrorStep('local_properties', tx =>
      smartSyncTable(
        tx,
        'local_properties',
        properties,
        'id',
        'INSERT OR REPLACE INTO local_properties (id, name, code, address, city, image_url, floor, basement) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.name,
          item.code,
          item.address || '',
          item.city || '',
          item.image_url || null,
          item.floor !== undefined && item.floor !== null ? item.floor : null,
          item.basement !== undefined && item.basement !== null ? item.basement : null,
        ],
      ),
    );
  }

  if (users !== null) {
    await runMirrorStep('local_users', tx =>
      smartSyncTable(
        tx,
        'local_users',
        users,
        'id',
        'INSERT OR REPLACE INTO local_users (id, username, email, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.username,
          item.email,
          item.first_name,
          item.last_name,
          item.role || null,
        ],
      ),
    );
  }

  if (userProperties !== null) {
    await runMirrorStep('local_user_properties', tx =>
      smartSyncTable(
        tx,
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
      ),
    );
  }

  if (instrumentos !== null) {
    await runMirrorStep('local_instrumentos', tx =>
      smartSyncTable(
        tx,
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
      ),
    );
  }

  if (sistemas !== null) {
    await runMirrorStep('local_sistemas', tx =>
      smartSyncTable(
        tx,
        'local_sistemas',
        sistemas,
        'id',
        'INSERT OR REPLACE INTO local_sistemas (id, nombre, activo) VALUES (?, ?, ?)',
        item => [item.id, item.nombre, item.activo ? 1 : 0],
      ),
    );
  }

  if (equipamentos !== null) {
    await runMirrorStep('local_equipamentos', tx =>
      smartSyncTable(
        tx,
        'local_equipamentos',
        equipamentos,
        'id',
        'INSERT OR REPLACE INTO local_equipamentos (id, nombre, abreviatura, frecuencia, id_sistema) VALUES (?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.nombre,
          item.abreviatura,
          item.frecuencia || item.Frecuencia || null,
          item.id_sistema || null,
        ],
      ),
    );
  }

  if (perguntasEquipamento !== null) {
    await runMirrorStep('local_preguntas_equipamento', tx =>
      smartSyncTable(
        tx,
        'local_preguntas_equipamento',
        perguntasEquipamento,
        'id',
        'INSERT OR REPLACE INTO local_preguntas_equipamento (id, equipamento_id, pregunta, orden, activa, ponderado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.equipamento_id,
          item.pregunta,
          item.orden,
          item.activa ? 1 : 0,
          item.ponderado ?? null,
          item.created_at,
          item.updated_at,
        ],
      ),
    );
  }

  if (auditQuestions !== null) {
    await runMirrorStep('local_audit_questions', tx =>
      smartSyncTable(
        tx,
        'local_audit_questions',
        auditQuestions,
        'id',
        'INSERT OR REPLACE INTO local_audit_questions (id, question_text, section_id, section_name, section_order_index, equipment_name, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        item => [
          item.id,
          item.question_text,
          item.section_id || null,
          item.section?.section_name || null,
          item.section?.order_index || null,
          item.equipment_name || null,
          item.is_active ? 1 : 0,
          item.updated_at || null,
        ],
      ),
    );
  }

  if (equipamentosProperty !== null) {
    await runMirrorStep('local_equipamentos_property', tx =>
      replaceCompositeRows(
        tx,
        'local_equipamentos_property',
        equipamentosProperty,
        'INSERT INTO local_equipamentos_property (id_equipamentos, id_property) VALUES (?, ?)',
        item => [item.id_equipamentos, item.id_property],
      ),
    );
  }

  if (scheduledMaintenances !== null) {
    await runMirrorStep('local_scheduled_maintenances', tx =>
      smartSyncTable(
        tx,
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
      ),
    );
  }

  if (sessions !== null) {
    await runMirrorStep('local_sesion_mantenimiento', async tx => {
      const hasLocalSessionReferences =
        sessions.length === 0
          ? await tx.getFirstAsync(`
              SELECT COUNT(*) as count
              FROM local_scheduled_maintenances
              WHERE id_sesion IS NOT NULL AND id_sesion != ''
            `)
          : null;
      const localSessionReferenceCount =
        (hasLocalSessionReferences as { count?: number } | null)?.count ?? 0;

      if (sessions.length === 0 && localSessionReferenceCount > 0) {
        console.warn(
          '[SmartSync] Skipped clearing local_sesion_mantenimiento: remote returned 0 sessions but local maintenances still reference sessions.',
          { localSessionReferenceCount },
        );
        return;
      }

      await smartSyncTable(
        tx,
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
    });
  }

  if (userSessions !== null) {
    await runMirrorStep('local_user_sesion_mantenimiento', tx =>
      replaceCompositeRows(
        tx,
        'local_user_sesion_mantenimiento',
        userSessions,
        'INSERT OR REPLACE INTO local_user_sesion_mantenimiento (id_user, id_sesion) VALUES (?, ?)',
        item => [item.id_user, item.id_sesion],
      ),
    );
  }

  if (sessionPhotos !== null) {
    await runMirrorStep('local_sesion_fotos', tx =>
      smartSyncTable(
        tx,
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
      ),
    );
  }

  console.log('[SmartSync] Mirror data sync completed');
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
  }, 'upsertCreatedMaintenanceLocally');
}

/**
 * Cleanup synced rows from offline queue tables to keep SQLite lean over time.
 * Keeps pending/error rows for retries and user visibility.
 * Session photos are only cleaned after the local mirror already has >= 2 rows
 * for that session, so we don't ask for photos again between push/pull cycles.
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
          AND id_sesion IN (
            SELECT id_sesion
            FROM local_sesion_fotos
            GROUP BY id_sesion
            HAVING COUNT(*) >= 2
          )
      `);

      await db.runAsync(`
        DELETE FROM offline_panel_configurations
        WHERE status = 'synced'
      `);
    });
  }, 'cleanupOfflineQueue');
}
