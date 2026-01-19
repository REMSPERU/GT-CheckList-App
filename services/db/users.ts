import { dbPromise, ensureInitialized } from './connection';

export async function saveCurrentUser(user: {
  id: string;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}) {
  await ensureInitialized();
  const db = await dbPromise;
  await db.runAsync(
    'INSERT OR REPLACE INTO local_users (id, username, email, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
    [
      user.id,
      user.username || user.email?.split('@')[0] || '',
      user.email,
      user.first_name || '',
      user.last_name || '',
      user.role || '',
    ],
  );
  console.log(
    'Current user saved to local DB:',
    user.email,
    'Role:',
    user.role || '',
  );
}

export async function getLocalUserById(id: string) {
  await ensureInitialized();
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    'SELECT * FROM local_users WHERE id = ?',
    [id],
  );
  return result;
}

export async function updateLocalUserRole(userId: string, role: string) {
  await ensureInitialized();
  const db = await dbPromise;
  await db.runAsync('UPDATE local_users SET role = ? WHERE id = ?', [
    role,
    userId,
  ]);
}
