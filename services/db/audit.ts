import { dbPromise, ensureInitialized, withLock } from './connection';

export interface LocalAuditQuestion {
  id: string;
  question_code: string;
  question_text: string;
  order_index: number;
  section_id: string | null;
  section_name: string | null;
  section_order_index: number | null;
  is_active: number;
}

export interface OfflineAuditSessionRecord {
  local_id: number;
  client_submission_id: string;
  property_id: string;
  auditor_id: string;
  created_by: string | null;
  scheduled_for: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  audit_payload: string | null;
  summary: string | null;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface AuditorAssignedProperty {
  id: string;
  name: string;
  address: string | null;
  image_url: string | null;
  [key: string]: unknown;
}

interface SaveOfflineAuditSessionInput {
  propertyId: string;
  auditorId: string;
  createdBy: string;
  scheduledFor: string;
  startedAt: string;
  submittedAt: string;
  auditPayload: Record<string, unknown>;
  summary: Record<string, unknown>;
}

function generateUuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const random = Math.floor(Math.random() * 16);
    const value = c === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function getAuditQuestions() {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return db.getAllAsync(
      `SELECT id, question_code, question_text, order_index, section_id, section_name, section_order_index, is_active
       FROM local_audit_questions
        WHERE is_active = 1
        ORDER BY COALESCE(section_order_index, 999999) ASC, order_index ASC`,
    ) as Promise<LocalAuditQuestion[]>;
  });
}

export async function getAssignedPropertiesForAuditor(userId: string) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    const now = new Date().toISOString();

    return db.getAllAsync(
      `SELECT p.*
       FROM local_properties p
       INNER JOIN local_user_properties up
         ON up.property_id = p.id
       WHERE up.user_id = ?
         AND (up.expires_at IS NULL OR up.expires_at > ?)
       ORDER BY p.name ASC`,
      [userId, now],
    ) as Promise<AuditorAssignedProperty[]>;
  });
}

export async function saveOfflineAuditSession(
  input: SaveOfflineAuditSessionInput,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    const clientSubmissionId = generateUuidV4();

    const result = await db.runAsync(
      `INSERT INTO offline_audit_sessions (
        client_submission_id,
        property_id,
        auditor_id,
        created_by,
        scheduled_for,
        status,
        started_at,
        submitted_at,
        audit_payload,
        summary,
        sync_status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 'ENVIADA', ?, ?, ?, ?, 'pending', ?)
      `,
      [
        clientSubmissionId,
        input.propertyId,
        input.auditorId,
        input.createdBy,
        input.scheduledFor,
        input.startedAt,
        input.submittedAt,
        JSON.stringify(input.auditPayload),
        JSON.stringify(input.summary),
        input.submittedAt,
      ],
    );

    return {
      localId: result.lastInsertRowId,
      clientSubmissionId,
    };
  });
}

export async function getPendingAuditSessions() {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return db.getAllAsync(
      `SELECT *
       FROM offline_audit_sessions
       WHERE sync_status IN ('pending', 'error')
       ORDER BY created_at ASC`,
    );
  });
}

export async function getAuditSessionsByProperty(propertyId: string) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return db.getAllAsync(
      `SELECT *
       FROM offline_audit_sessions
       WHERE property_id = ?
       ORDER BY COALESCE(submitted_at, created_at) DESC`,
      [propertyId],
    ) as Promise<OfflineAuditSessionRecord[]>;
  });
}

export async function updateOfflineAuditSessionStatus(
  localId: number,
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error',
  errorMessage: string | null = null,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    const syncedAt = syncStatus === 'synced' ? new Date().toISOString() : null;

    await db.runAsync(
      `UPDATE offline_audit_sessions
       SET sync_status = ?,
           error_message = ?,
           synced_at = ?
       WHERE local_id = ?`,
      [syncStatus, errorMessage, syncedAt, localId],
    );
  });
}
