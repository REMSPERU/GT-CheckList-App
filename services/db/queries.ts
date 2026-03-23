import { dbPromise, ensureInitialized, withLock } from './connection';

// --- READ METHODS FOR UI ---

function normalizeMaintenanceStatus(status: unknown): string | null {
  if (!status || typeof status !== 'string') return null;

  switch (status) {
    case 'NO INICIADO':
      return 'NO_INICIADO';
    case 'EN PROGRESO':
      return 'EN_PROGRESO';
    default:
      return status;
  }
}

export async function getLocalEquipments() {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync('SELECT * FROM local_equipos');
  });
}

export async function getEquipmentById(id: string) {
  await ensureInitialized();
  return withLock(async () => {
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
  });
}

export async function getLocalProperties() {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      'SELECT * FROM local_properties ORDER BY name ASC',
    );
  });
}

export async function getEquipamentosByProperty(propertyId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    // Join local_equipamentos and local_equipamentos_property
    const rows = await db.getAllAsync(
      `
        SELECT e.id, e.nombre, e.abreviatura
             , e.frecuencia
        FROM local_equipamentos e
        JOIN local_equipamentos_property ep ON e.id = ep.id_equipamentos
        WHERE ep.id_property = ?
        `,
      [propertyId],
    );
    return rows;
  });
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
  return withLock(async () => {
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
          let syncStatus = row.sync_status;
          if (!syncStatus && row.config === 1) {
            syncStatus = 'synced';
          }

          return {
            ...row,
            equipment_detail: row.equipment_detail
              ? JSON.parse(row.equipment_detail)
              : null,
            config: row.config === 1,
            syncStatus,
          };
        } catch (e) {
          console.error('Error parsing panel detail:', e);
          return row;
        }
      })
      .filter(panel => {
        if (
          filters?.type &&
          panel.equipment_detail?.tipo_tablero !== filters.type
        ) {
          return false;
        }

        if (filters?.config !== undefined && filters?.config !== null) {
          if (panel.config !== filters.config) return false;
        }

        if (filters?.locations && filters.locations.length > 0) {
          if (!filters.locations.includes(panel.ubicacion)) return false;
        }

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
  return withLock(async () => {
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
        if (filters?.config !== undefined && filters?.config !== null) {
          if (equipment.config !== filters.config) return false;
        }

        if (filters?.locations && filters.locations.length > 0) {
          if (!filters.locations.includes(equipment.ubicacion)) return false;
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesCode = equipment.codigo
            ?.toLowerCase()
            .includes(searchLower);
          if (!matchesCode) return false;
        }

        return true;
      });
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

    if (!rows || rows.length === 0) return [];

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
        e.id as e_id, e.codigo as e_codigo, e.ubicacion as e_ubicacion, e.detalle_ubicacion as e_detalle_ubicacion, e.id_property as e_id_property, e.equipment_detail as e_detail,
        eq.nombre as eq_nombre,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM offline_maintenance_response om_err
            WHERE om_err.id_mantenimiento = m.id
              AND om_err.status = 'error'
          ) OR EXISTS (
            SELECT 1
            FROM offline_grounding_well_checklist og_err
            WHERE og_err.maintenance_id = m.id
              AND og_err.status = 'error'
          ) THEN 'error'
          WHEN EXISTS (
            SELECT 1
            FROM offline_maintenance_response om_sync
            WHERE om_sync.id_mantenimiento = m.id
              AND om_sync.status = 'syncing'
          ) OR EXISTS (
            SELECT 1
            FROM offline_grounding_well_checklist og_sync
            WHERE og_sync.maintenance_id = m.id
              AND og_sync.status = 'syncing'
          ) THEN 'syncing'
          WHEN EXISTS (
            SELECT 1
            FROM offline_maintenance_response om_pending
            WHERE om_pending.id_mantenimiento = m.id
              AND om_pending.status = 'pending'
          ) OR EXISTS (
            SELECT 1
            FROM offline_grounding_well_checklist og_pending
            WHERE og_pending.maintenance_id = m.id
              AND og_pending.status = 'pending'
          ) THEN 'pending'
          ELSE 'synced'
        END as sync_status
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
      estatus: normalizeMaintenanceStatus(row.estatus),
      tipo_mantenimiento: row.tipo_mantenimiento,
      codigo: row.codigo,
      id_sesion: row.id_sesion || null,
      sync_status: row.sync_status || 'synced',
      equipos: {
        id: row.e_id,
        codigo: row.e_codigo,
        ubicacion: row.e_ubicacion,
        detalle_ubicacion: row.e_detalle_ubicacion,
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

export async function getLocalScheduledMaintenanceById(maintenanceId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    const row = await db.getFirstAsync(
      'SELECT id, id_equipo, id_sesion FROM local_scheduled_maintenances WHERE id = ? LIMIT 1',
      [maintenanceId],
    );

    return row;
  });
}

export async function updateLocalScheduledMaintenanceStatus(
  maintenanceId: string,
  status: string,
) {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE local_scheduled_maintenances
       SET estatus = ?, last_synced_at = ?
       WHERE id = ?`,
      [status, new Date().toISOString(), maintenanceId],
    );
  });
}

/**
 * Get real maintenance sessions for a property from local mirror.
 * Returns sessions with their maintenance counts and technicians.
 */
export async function getLocalSessionsByProperty(propertyId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    const rows = await db.getAllAsync(
      `
      SELECT
        s.*,
        COUNT(m.id) as total_count,
        SUM(CASE WHEN m.estatus = 'FINALIZADO' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN m.estatus IN ('EN_PROGRESO', 'EN PROGRESO') THEN 1 ELSE 0 END) as in_progress_count,
        (
          SELECT GROUP_CONCAT(DISTINCT eq.nombre)
          FROM local_scheduled_maintenances m2
          JOIN local_equipos e ON m2.id_equipo = e.id
          JOIN local_equipamentos eq ON e.id_equipamento = eq.id
          WHERE m2.id_sesion = s.id
        ) as equipment_types
      FROM local_sesion_mantenimiento s
      LEFT JOIN local_scheduled_maintenances m ON m.id_sesion = s.id
      WHERE s.id_property = ?
      GROUP BY s.id
      ORDER BY s.fecha_programada ASC
      `,
      [propertyId],
    );

    return rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      fecha_programada: row.fecha_programada,
      estatus: normalizeMaintenanceStatus(row.estatus) || 'NO_INICIADO',
      id_property: row.id_property,
      created_by: row.created_by,
      created_at: row.created_at,
      total: row.total_count || 0,
      completed: row.completed_count || 0,
      inProgress: row.in_progress_count || 0,
      equipmentTypes: row.equipment_types ? row.equipment_types.split(',') : [],
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

export async function getChecklistQuestionsByEquipamento(
  equipamentoId: string,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const rows = (await db.getAllAsync(
      `
        SELECT id, equipamento_id, pregunta, orden, activa, created_at, updated_at
        FROM local_preguntas_equipamento
        WHERE equipamento_id = ?
          AND activa = 1
        ORDER BY orden ASC
      `,
      [equipamentoId],
    )) as any[];

    return rows.map(row => ({
      ...row,
      activa: row.activa === 1,
    }));
  });
}
