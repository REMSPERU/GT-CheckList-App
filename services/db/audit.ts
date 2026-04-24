import { dbPromise, ensureInitialized, withLock } from './connection';

export interface LocalAuditQuestion {
  id: string;
  question_text: string;
  section_id: string | null;
  section_name: string | null;
  section_order_index: number | null;
  equipment_name: string | null;
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

export interface SyncedAuditSessionInput {
  client_submission_id: string;
  property_id: string;
  auditor_id: string;
  created_by?: string | null;
  scheduled_for: string;
  status: string;
  started_at?: string | null;
  submitted_at?: string | null;
  audit_payload?: Record<string, unknown> | string | null;
  summary?: Record<string, unknown> | string | null;
  created_at?: string | null;
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

function toJsonText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export async function getAuditQuestions() {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    return db.getAllAsync(
      `SELECT id, question_text, section_id, section_name, section_order_index, equipment_name, is_active
       FROM local_audit_questions
        WHERE is_active = 1
        ORDER BY
          COALESCE(section_order_index, 999999) ASC,
          LOWER(COALESCE(equipment_name, '')) ASC,
          LOWER(COALESCE(question_text, '')) ASC`,
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

export async function upsertSyncedAuditSessions(
  sessions: SyncedAuditSessionInput[],
) {
  await ensureInitialized();

  if (sessions.length === 0) {
    return;
  }

  return withLock(async () => {
    const db = await dbPromise;
    const syncedAt = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      for (const session of sessions) {
        await db.runAsync(
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
            error_message,
            created_at,
            synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', NULL, ?, ?)
          ON CONFLICT(client_submission_id) DO UPDATE SET
            property_id = excluded.property_id,
            auditor_id = excluded.auditor_id,
            created_by = excluded.created_by,
            scheduled_for = excluded.scheduled_for,
            status = excluded.status,
            started_at = excluded.started_at,
            submitted_at = excluded.submitted_at,
            audit_payload = excluded.audit_payload,
            summary = excluded.summary,
            sync_status = 'synced',
            error_message = NULL,
            synced_at = excluded.synced_at`,
          [
            session.client_submission_id,
            session.property_id,
            session.auditor_id,
            session.created_by || session.auditor_id,
            session.scheduled_for,
            session.status,
            session.started_at || null,
            session.submitted_at || null,
            toJsonText(session.audit_payload),
            toJsonText(session.summary),
            session.created_at || session.submitted_at || syncedAt,
            syncedAt,
          ],
        );
      }
    });
  });
}
