import { dbPromise, ensureInitialized } from './connection';

// --- READ METHODS FOR UI ---

export async function getLocalEquipments() {
  await ensureInitialized();
  const db = await dbPromise;
  return await db.getAllAsync('SELECT * FROM local_equipos');
}

export async function getEquipmentById(id: string) {
  await ensureInitialized();
  const db = await dbPromise;
  const row = (await db.getFirstAsync(
    'SELECT * FROM local_equipos WHERE id = ?',
    [id],
  )) as any;

  if (!row) return null;

  try {
    return {
      ...row,
      equipment_detail: row.equipment_detail
        ? JSON.parse(row.equipment_detail)
        : null,
      config: row.config === 1,
    };
  } catch (e) {
    console.error('Error parsing equipment detail:', e);
    return row;
  }
}

export async function getLocalProperties() {
  await ensureInitialized();
  const db = await dbPromise;
  return await db.getAllAsync('SELECT * FROM local_properties');
}

export async function getEquipamentosByProperty(propertyId: string) {
  await ensureInitialized();
  const db = await dbPromise;
  // Join local_equipamentos and local_equipamentos_property
  const rows = await db.getAllAsync(
    `
      SELECT e.id, e.nombre, e.abreviatura
      FROM local_equipamentos e
      JOIN local_equipamentos_property ep ON e.id = ep.id_equipamentos
      WHERE ep.id_property = ?
      `,
    [propertyId],
  );
  return rows;
}

export async function getElectricalPanelsByProperty(
  propertyId: string,
  filters?: {
    type?: string;
    search?: string;
    config?: boolean | null;
    locations?: string[];
    equipamentoId?: string; // Filter by equipment type (e.g., TBELEC id)
  },
) {
  await ensureInitialized();
  const db = await dbPromise;

  // 1. Fetch panels for the property, optionally filtered by equipment type
  let query = 'SELECT * FROM local_equipos WHERE id_property = ?';
  const params: any[] = [propertyId];

  if (filters?.equipamentoId) {
    query += ' AND id_equipamento = ?';
    params.push(filters.equipamentoId);
  }

  const rows = (await db.getAllAsync(query, params)) as any[];

  // 2. Parse JSON and Apply Filters in Memory
  return rows
    .map(row => {
      try {
        return {
          ...row,
          equipment_detail: row.equipment_detail
            ? JSON.parse(row.equipment_detail)
            : null,
          // Convert SQLite integer boolean (0/1) to true/false
          config: row.config === 1,
        };
      } catch (e) {
        console.error('Error parsing panel detail:', e);
        return row;
      }
    })
    .filter(panel => {
      // Filter by Type
      if (
        filters?.type &&
        panel.equipment_detail?.tipo_tablero !== filters.type
      ) {
        return false;
      }

      // Filter by Config Status (null means "All", so ignore if null/undefined)
      if (filters?.config !== undefined && filters?.config !== null) {
        if (panel.config !== filters.config) return false;
      }

      // Filter by Locations
      if (filters?.locations && filters.locations.length > 0) {
        if (!filters.locations.includes(panel.ubicacion)) return false;
      }

      // Filter by Search (Code or Label)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesCode = panel.codigo?.toLowerCase().includes(searchLower);
        const matchesLabel = panel.equipment_detail?.rotulo
          ?.toLowerCase()
          .includes(searchLower);
        if (!matchesCode && !matchesLabel) return false;
      }

      return true;
    });
}

/**
 * Generic method to get equipment by property and equipment type.
 * Works for any equipment type (emergency lights, etc.)
 */
export async function getEquipmentByProperty(
  propertyId: string,
  filters?: {
    search?: string;
    config?: boolean | null;
    locations?: string[];
    equipamentoId?: string;
  },
) {
  await ensureInitialized();
  const db = await dbPromise;

  let query =
    'SELECT * FROM local_equipos WHERE id_property = ? AND (estatus IS NULL OR estatus != ?)';
  const params: any[] = [propertyId, 'INACTIVO'];

  if (filters?.equipamentoId) {
    query += ' AND id_equipamento = ?';
    params.push(filters.equipamentoId);
  }

  const rows = (await db.getAllAsync(query, params)) as any[];

  return rows
    .map(row => {
      try {
        return {
          ...row,
          equipment_detail: row.equipment_detail
            ? JSON.parse(row.equipment_detail)
            : null,
          config: row.config === 1,
        };
      } catch (e) {
        console.error('Error parsing equipment detail:', e);
        return row;
      }
    })
    .filter(equipment => {
      // Filter by Config Status
      if (filters?.config !== undefined && filters?.config !== null) {
        if (equipment.config !== filters.config) return false;
      }

      // Filter by Locations
      if (filters?.locations && filters.locations.length > 0) {
        if (!filters.locations.includes(equipment.ubicacion)) return false;
      }

      // Filter by Search (Code)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesCode = equipment.codigo
          ?.toLowerCase()
          .includes(searchLower);
        if (!matchesCode) return false;
      }

      return true;
    });
}
