import { dbPromise, ensureInitialized, withLock } from './connection';

export interface OfflineChecklistPhotoInput {
  questionId?: string | null;
  kind: 'general' | 'question';
  localUri: string;
}

export interface OfflineChecklistResponseInput {
  clientSubmissionId: string;
  buildingId: string;
  equipamentoId: string;
  equipoId: string;
  frequency: string;
  periodStart: string;
  periodEnd: string;
  userCreated: string;
  payload: unknown;
  photos: OfflineChecklistPhotoInput[];
}

export interface OfflineChecklistCount {
  equipo_id: string;
  synced_count: number;
  pending_count: number;
  conflict_count: number;
}

export async function saveOfflineChecklistResponse(
  input: OfflineChecklistResponseInput,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    let localId = 0;

    console.log('[DEBUG] saveOfflineChecklistResponse db before tx:', db, typeof db);
    await db.withTransactionAsync(async () => {
      console.log('[DEBUG] saveOfflineChecklistResponse db inside tx:', db, typeof db);
      const result = await db.runAsync(
        `INSERT INTO offline_checklist_responses (
          client_submission_id,
          building_id,
          equipamento_id,
          equipo_id,
          frequency,
          period_start,
          period_end,
          user_created,
          payload_json,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          input.clientSubmissionId,
          input.buildingId,
          input.equipamentoId,
          input.equipoId,
          input.frequency,
          input.periodStart,
          input.periodEnd,
          input.userCreated,
          JSON.stringify(input.payload),
        ],
      );

      localId = result.lastInsertRowId;

      for (const photo of input.photos) {
        await db.runAsync(
          `INSERT INTO offline_checklist_photos (
            checklist_local_id,
            question_id,
            kind,
            local_uri,
            status
          ) VALUES (?, ?, ?, ?, 'pending')`,
          [localId, photo.questionId ?? null, photo.kind, photo.localUri],
        );
      }
    });

    return localId;
  });
}

export async function getPendingChecklistResponses() {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      `SELECT *
       FROM offline_checklist_responses
       WHERE status IN ('pending', 'syncing', 'error')
       ORDER BY created_at ASC`,
    );
  });
}

export async function updateOfflineChecklistResponseStatus(
  localId: number,
  status: 'pending' | 'syncing' | 'synced' | 'error' | 'conflict',
  errorMessage?: string | null,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE offline_checklist_responses
       SET status = ?, error_message = ?, synced_at = CASE WHEN ? = 'synced' THEN CURRENT_TIMESTAMP ELSE synced_at END
       WHERE local_id = ?`,
      [status, errorMessage ?? null, status, localId],
    );
  });
}

export async function getChecklistPhotosByLocalId(localId: number) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      `SELECT *
       FROM offline_checklist_photos
       WHERE checklist_local_id = ?
       ORDER BY id ASC`,
      [localId],
    );
  });
}

export async function updateOfflineChecklistPhotoStatus(
  id: number,
  status: 'pending' | 'syncing' | 'synced' | 'error',
  remote?: { bucket: string; path: string; publicUrl: string } | null,
  errorMessage?: string | null,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE offline_checklist_photos
       SET status = ?,
           remote_bucket = ?,
           remote_path = ?,
           remote_public_url = ?,
           error_message = ?
       WHERE id = ?`,
      [
        status,
        remote?.bucket ?? null,
        remote?.path ?? null,
        remote?.publicUrl ?? null,
        errorMessage ?? null,
        id,
      ],
    );
  });
}

export async function getChecklistCountsByEquipo(
  buildingId: string,
  equipamentoId: string,
  frequency: string,
  periodStart: string,
): Promise<OfflineChecklistCount[]> {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return (await db.getAllAsync(
      `SELECT
         equipo_id,
         SUM(CASE WHEN status = 'synced' THEN 1 ELSE 0 END) AS synced_count,
         SUM(CASE WHEN status IN ('pending', 'syncing', 'error') THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN status = 'conflict' THEN 1 ELSE 0 END) AS conflict_count
       FROM offline_checklist_responses
       WHERE building_id = ?
         AND equipamento_id = ?
         AND frequency = ?
         AND period_start = ?
       GROUP BY equipo_id`,
      [buildingId, equipamentoId, frequency, periodStart],
    )) as OfflineChecklistCount[];
  });
}
