import { dbPromise, withLock, ensureInitialized } from './connection';

export async function clearMirrorTables() {
  await ensureInitialized();
  const db = await dbPromise;
  await db.execAsync(`
    DELETE FROM local_equipos;
    DELETE FROM local_properties;
    DELETE FROM local_users;
    DELETE FROM local_equipamentos;
    DELETE FROM local_equipamentos_property;
    DELETE FROM offline_panel_configurations;
  `);
}

export async function bulkInsertMirrorData(
  equipos: any[],
  properties: any[],
  users: any[],
  equipamentos: any[] = [],
  equipamentosProperty: any[] = [],
) {
  return withLock(async () => {
    const db = await dbPromise;

    // Use transactions for bulk inserts
    await db.withTransactionAsync(async () => {
      // Equipos
      for (const item of equipos) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_equipos (id, id_property, id_equipamento, codigo, ubicacion, detalle_ubicacion, estatus, equipment_detail, config, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
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

      // Properties
      for (const item of properties) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_properties (id, name, code, address, city) VALUES (?, ?, ?, ?, ?)',
          [item.id, item.name, item.code, item.address || '', item.city || ''],
        );
      }

      // Users
      for (const item of users) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_users (id, username, email, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
          [item.id, item.username, item.email, item.first_name, item.last_name],
        );
      }

      // Equipamentos
      for (const item of equipamentos) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_equipamentos (id, nombre, abreviatura) VALUES (?, ?, ?)',
          [item.id, item.nombre, item.abreviatura],
        );
      }

      // Equipamentos Property
      for (const item of equipamentosProperty) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_equipamentos_property (id_equipamentos, id_property) VALUES (?, ?)',
          [item.id_equipamentos, item.id_property],
        );
      }
    });
  });
}
