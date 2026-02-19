import { dbPromise, ensureInitialized, withLock } from './connection';

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
  return await db.getAllAsync(
    'SELECT * FROM local_properties ORDER BY name ASC',
  );
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

  // 1. Fetch panels with sync status from offline_panel_configurations
  // Using LEFT JOIN to get the latest sync status for each panel
  let query = `
    SELECT e.*, 
      (SELECT opc.status 
       FROM offline_panel_configurations opc 
       WHERE opc.panel_id = e.id 
       ORDER BY opc.created_at DESC 
       LIMIT 1) as sync_status
    FROM local_equipos e
    WHERE e.id_property = ?`;
  const params: any[] = [propertyId];

  if (filters?.equipamentoId) {
    query += ' AND e.id_equipamento = ?';
    params.push(filters.equipamentoId);
  }

  const rows = (await db.getAllAsync(query, params)) as any[];

  // 2. Parse JSON and Apply Filters in Memory
  return rows
    .map(row => {
      try {
        // Determine effective sync status:
        // - If panel has pending/syncing/error config in queue -> use that status
        // - If panel is configured (config=1) and no pending sync -> 'synced'
        // - If not configured -> null
        let syncStatus = row.sync_status;
        if (!syncStatus && row.config === 1) {
          syncStatus = 'synced';
        }

        return {
          ...row,
          equipment_detail: row.equipment_detail
            ? JSON.parse(row.equipment_detail)
            : null,
          // Convert SQLite integer boolean (0/1) to true/false
          config: row.config === 1,
          syncStatus,
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

/**
 * Get scheduled maintenances from local mirror.
 * Joins with Equipos and Properties to match Supabase structure.
 */
export async function getLocalScheduledMaintenances() {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;

    // Manual Join strategy for better control over JSON parsing
    const maintenances = await db.getAllAsync(
      'SELECT * FROM local_scheduled_maintenances ORDER BY dia_programado ASC',
    );
    if (!maintenances || maintenances.length === 0) return [];

    // Fetch related data
    const rows = await db.getAllAsync(`
      SELECT 
        m.*,
        e.id as e_id, e.codigo as e_codigo, e.ubicacion as e_ubicacion, e.id_property as e_id_property,
        p.id as p_id, p.name as p_name, p.address as p_address
      FROM local_scheduled_maintenances m
      LEFT JOIN local_equipos e ON m.id_equipo = e.id
      LEFT JOIN local_properties p ON e.id_property = p.id
      ORDER BY m.dia_programado ASC
    `);

    const results = rows.map((row: any) => ({
      id: row.id,
      dia_programado: row.dia_programado,
      tipo_mantenimiento: row.tipo_mantenimiento,
      observations: row.observations,
      id_equipo: row.id_equipo,
      // Construct nested objects
      equipos: {
        id: row.e_id,
        codigo: row.e_codigo,
        ubicacion: row.e_ubicacion,
        properties: {
          id: row.p_id,
          name: row.p_name,
          address: row.p_address,
        },
      },
      // Map assigned technicians
      user_maintenace: (() => {
        try {
          return row.assigned_technicians
            ? JSON.parse(row.assigned_technicians).map((id: string) => ({
                id_user: id,
              }))
            : [];
        } catch (e) {
          console.error('Error parsing assigned technicians:', e);
          return [];
        }
      })(),
    }));

    return results;
  });
}

export async function getLocalMaintenancesByProperty(propertyId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    const rows = await db.getAllAsync(
      `
      SELECT 
        m.*,
        e.id as e_id, e.codigo as e_codigo, e.ubicacion as e_ubicacion, e.id_property as e_id_property, e.equipment_detail as e_detail,
        eq.nombre as eq_nombre
      FROM local_scheduled_maintenances m
      JOIN local_equipos e ON m.id_equipo = e.id
      LEFT JOIN local_equipamentos eq ON e.id_equipamento = eq.id
      WHERE e.id_property = ?
      ORDER BY m.dia_programado ASC
    `,
      [propertyId],
    );

    return rows.map((row: any) => ({
      id: row.id,
      dia_programado: row.dia_programado,
      estatus: row.estatus,
      tipo_mantenimiento: row.tipo_mantenimiento,
      codigo: row.codigo,
      equipos: {
        id: row.e_id,
        codigo: row.e_codigo,
        ubicacion: row.e_ubicacion,
        id_property: row.e_id_property,
        equipment_detail: (() => {
          try {
            return row.e_detail ? JSON.parse(row.e_detail) : null;
          } catch (e) {
            console.error('Error parsing equipment detail:', e);
            return null;
          }
        })(),
        equipamentos: {
          nombre: row.eq_nombre,
        },
      },
    }));
  });
}

export async function getInstrumentsByEquipmentType(equipmentTypeId: string) {
  await ensureInitialized();
  const db = await dbPromise;
  return await db.getAllAsync(
    'SELECT * FROM local_instrumentos WHERE equipamento = ?',
    [equipmentTypeId],
  );
}
