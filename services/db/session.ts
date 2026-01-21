import { dbPromise, withLock } from './connection';

export interface LocalSession {
  user_id: string;
  access_token: string;
  refresh_token: string;
  user_metadata: any;
  expires_at: number;
  last_active: string;
}

export async function saveSession(session: LocalSession): Promise<void> {
  const db = await dbPromise;
  await withLock(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_session (
        user_id, 
        access_token, 
        refresh_token, 
        user_metadata, 
        expires_at, 
        last_active
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.user_id,
        session.access_token,
        session.refresh_token,
        JSON.stringify(session.user_metadata),
        session.expires_at,
        session.last_active,
      ],
    );
  });
}

export async function getSession(): Promise<LocalSession | null> {
  const db = await dbPromise;
  // Get the most recent session or the only one (assuming single user per device for now)
  const result = await db.getAllAsync<any>(
    'SELECT * FROM app_session ORDER BY last_active DESC LIMIT 1',
  );

  if (result && result.length > 0) {
    const row = result[0];
    try {
      return {
        ...row,
        user_metadata: JSON.parse(row.user_metadata),
      };
    } catch (e) {
      console.error('Error parsing user_metadata', e);
      return row;
    }
  }
  return null;
}

export async function clearSession(): Promise<void> {
  const db = await dbPromise;
  await withLock(async () => {
    await db.runAsync('DELETE FROM app_session');
  });
}
