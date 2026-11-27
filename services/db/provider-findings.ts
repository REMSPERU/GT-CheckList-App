import type { ProviderFinding } from '@/types/provider-finding';
import { dbPromise, ensureInitialized, withLock } from './connection';

export async function replaceProviderFindings(
  userId: string,
  findings: ProviderFinding[],
) {
  await ensureInitialized();
  const db = await dbPromise;
  await withLock(async () => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM local_provider_equipment_findings');
      for (const finding of findings) {
        await db.runAsync(
          `INSERT INTO local_provider_equipment_findings
           (id, asset_id, user_id, note, created_at) VALUES (?, ?, ?, ?, ?)`,
          finding.id,
          finding.asset_id,
          userId,
          finding.note,
          finding.created_at,
        );
      }
    });
  });
}

export async function getLocalProviderFindings(
  userId: string,
  assetId: string,
) {
  await ensureInitialized();
  const db = await dbPromise;
  return withLock(() =>
    db.getAllAsync<ProviderFinding>(
      `SELECT id, asset_id, note, created_at
       FROM local_provider_equipment_findings
       WHERE user_id = ? AND asset_id = ?
       ORDER BY created_at DESC, id`,
      userId,
      assetId,
    ),
  );
}
