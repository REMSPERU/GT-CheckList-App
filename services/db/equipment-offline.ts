import { dbPromise, withLock, ensureInitialized } from './connection';

export async function saveOfflineEquipment(
  action: 'create' | 'update',
  idEquipo: string,
  data: any
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      let idProperty = data.id_property;
      let idEquipamento = data.id_equipamento;
      let codigo = data.codigo;
      let ubicacion = data.ubicacion;
      let detalleUbicacion = data.detalle_ubicacion;
      let estatus = data.estatus || 'ACTIVO';
      let equipmentDetail = data.equipment_detail;
      let config = data.config;

      if (action === 'update') {
        // Fetch existing record from local_equipos to populate required fields
        const existing = await db.getFirstAsync<{
          id_property: string;
          id_equipamento: string;
          codigo: string;
          ubicacion: string;
          detalle_ubicacion: string;
          estatus: string;
          equipment_detail: string;
          config: number;
        }>(
          `SELECT id_property, id_equipamento, codigo, ubicacion, detalle_ubicacion, estatus, equipment_detail, config 
           FROM local_equipos WHERE id = ?`,
          [idEquipo]
        );

        if (existing) {
          idProperty = idProperty ?? existing.id_property;
          idEquipamento = idEquipamento ?? existing.id_equipamento;
          codigo = codigo ?? existing.codigo;
          ubicacion = ubicacion ?? existing.ubicacion;
          detalleUbicacion = detalleUbicacion !== undefined ? detalleUbicacion : existing.detalle_ubicacion;
          estatus = estatus ?? existing.estatus;
          equipmentDetail = equipmentDetail ?? (existing.equipment_detail ? JSON.parse(existing.equipment_detail) : {});
          config = config !== undefined ? (config ? 1 : 0) : existing.config;
        } else {
          // Check in offline_equipos in case it was created offline but not synced yet
          const pendingCreate = await db.getFirstAsync<{
            id_property: string;
            id_equipamento: string;
            codigo: string;
            ubicacion: string;
            detalle_ubicacion: string;
            estatus: string;
            equipment_detail: string;
            config: number;
          }>(
            `SELECT id_property, id_equipamento, codigo, ubicacion, detalle_ubicacion, estatus, equipment_detail, config 
             FROM offline_equipos WHERE id_equipo = ? AND action = 'create' LIMIT 1`,
            [idEquipo]
          );
          if (pendingCreate) {
            idProperty = idProperty ?? pendingCreate.id_property;
            idEquipamento = idEquipamento ?? pendingCreate.id_equipamento;
            codigo = codigo ?? pendingCreate.codigo;
            ubicacion = ubicacion ?? pendingCreate.ubicacion;
            detalleUbicacion = detalleUbicacion !== undefined ? detalleUbicacion : pendingCreate.detalle_ubicacion;
            estatus = estatus ?? pendingCreate.estatus;
            equipmentDetail = equipmentDetail ?? (pendingCreate.equipment_detail ? JSON.parse(pendingCreate.equipment_detail) : {});
            config = config !== undefined ? (config ? 1 : 0) : pendingCreate.config;
          }
        }
      }

      const jsonDetail = JSON.stringify(equipmentDetail || {});
      const intConfig = config ? 1 : 0;

      // 1. Queue write action for sync
      await db.runAsync(
        `INSERT INTO offline_equipos (
          id_equipo, action, id_property, id_equipamento, codigo, 
          ubicacion, detalle_ubicacion, estatus, equipment_detail, config, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          idEquipo,
          action,
          idProperty || '',
          idEquipamento || '',
          codigo || '',
          ubicacion || '',
          detalleUbicacion || null,
          estatus,
          jsonDetail,
          intConfig
        ]
      );

      // 2. Perform optimistic update on local mirror table
      if (action === 'create') {
        await db.runAsync(
          `INSERT OR REPLACE INTO local_equipos (
            id, id_property, id_equipamento, codigo, ubicacion, 
            detalle_ubicacion, estatus, equipment_detail, config, last_synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            idEquipo,
            idProperty || '',
            idEquipamento || '',
            codigo || '',
            ubicacion || '',
            detalleUbicacion || null,
            estatus,
            jsonDetail,
            intConfig,
            new Date().toISOString()
          ]
        );
      } else {
        // update
        await db.runAsync(
          `UPDATE local_equipos SET 
            id_property = ?, 
            id_equipamento = ?, 
            codigo = ?, 
            ubicacion = ?, 
            detalle_ubicacion = ?, 
            estatus = ?, 
            equipment_detail = ?, 
            config = ?, 
            last_synced_at = ?
           WHERE id = ?`,
          [
            idProperty || '',
            idEquipamento || '',
            codigo || '',
            ubicacion || '',
            detalleUbicacion || null,
            estatus,
            jsonDetail,
            intConfig,
            new Date().toISOString(),
            idEquipo
          ]
        );
      }
    });
  });
}

export async function getPendingEquipos() {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync<any>(
      `SELECT * FROM offline_equipos WHERE status = 'pending' OR status = 'error'`
    );
  });
}

export async function updateOfflineEquipmentStatus(
  localId: number,
  status: string,
  errorMessage: string | null = null
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const now = status === 'synced' ? new Date().toISOString() : null;
    await db.runAsync(
      `UPDATE offline_equipos SET status = ?, error_message = ?, synced_at = ? WHERE local_id = ?`,
      [status, errorMessage, now, localId]
    );
  });
}
