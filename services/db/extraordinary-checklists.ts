import { dbPromise, ensureInitialized, withLock } from './connection';

export interface ExtraordinaryChecklist {
  id: string;
  asset_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

interface LocalExtraordinaryChecklist extends ExtraordinaryChecklist {
  buildingId: string;
  buildingName: string;
  equipamentoId: string;
  equipamentoNombre: string;
  equipoCodigo: string;
  equipoUbicacion: string;
  equipoDetalleUbicacion: string;
}

export async function replaceExtraordinaryChecklists(
  userId: string,
  assignments: ExtraordinaryChecklist[],
) {
  await ensureInitialized();
  const db = await dbPromise;
  await withLock(() =>
    db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM local_extraordinary_checklists');
      for (const assignment of assignments) {
        await db.runAsync(
          `INSERT INTO local_extraordinary_checklists
           (id, asset_id, user_id, start_date, end_date, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          assignment.id,
          assignment.asset_id,
          userId,
          assignment.start_date,
          assignment.end_date,
          assignment.reason,
        );
      }
    }),
  );
}

export async function getLocalExtraordinaryChecklists(userId: string) {
  await ensureInitialized();
  const db = await dbPromise;
  return withLock(() =>
    db.getAllAsync<LocalExtraordinaryChecklist>(
      `SELECT a.id, a.asset_id, a.start_date, a.end_date, a.reason,
        p.id AS buildingId, p.name AS buildingName,
        t.id AS equipamentoId, t.nombre AS equipamentoNombre,
        e.codigo AS equipoCodigo, COALESCE(e.ubicacion, '') AS equipoUbicacion,
        COALESCE(e.detalle_ubicacion, '') AS equipoDetalleUbicacion
      FROM local_extraordinary_checklists a
      JOIN local_equipos e ON e.id = a.asset_id
      JOIN local_properties p ON p.id = e.id_property
      JOIN local_equipamentos t ON t.id = e.id_equipamento
      WHERE a.user_id = ? AND COALESCE(e.estatus, '') <> 'INACTIVO'
        AND NOT EXISTS (
          SELECT 1 FROM offline_checklist_responses r
          WHERE r.user_created = a.user_id AND r.equipo_id = a.asset_id
            AND r.frequency = 'EXTRAORDINARIA'
            AND json_extract(r.payload_json, '$.extraordinary_assignment_id') = a.id
        )
      ORDER BY a.start_date, a.end_date, a.id`,
      userId,
    ),
  );
}
