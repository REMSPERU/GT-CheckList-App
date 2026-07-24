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

export async function getLocalAssignedProperties(userId: string) {
  await ensureInitialized();
  const db = await dbPromise;
  const now = new Date().toISOString();
  return await db.getAllAsync(
    `SELECT p.*
       FROM local_properties p
       INNER JOIN local_user_properties up
         ON up.property_id = p.id
       WHERE up.user_id = ?
         AND (up.expires_at IS NULL OR up.expires_at > ?)
       ORDER BY p.name ASC`,
    [userId, now],
  );
}

export async function getLocalPropertyById(id: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const row = (await db.getFirstAsync(
      'SELECT * FROM local_properties WHERE id = ?',
      [id],
    )) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      city: row.city,
      image_url: row.image_url,
      floor: row.floor,
      basement: row.basement,
      // Map other default values for compatibility with PropertyResponse
      property_type: 'Unknown',
      is_active: true,
      maintenance_priority: 'Low',
      country: '',
      created_at: '',
    };
  });
}

export async function getEquipamentosByProperty(propertyId: string) {
  await ensureInitialized();
  const db = await dbPromise;
  // Get unique equipments associated with active equipments of this property
  const rows = await db.getAllAsync(
    `
        SELECT DISTINCT e.id, e.nombre, e.abreviatura, e.frecuencia
        FROM local_equipamentos e
        JOIN local_equipos eq ON e.id = eq.id_equipamento
        WHERE eq.id_property = ?
          AND (eq.estatus IS NULL OR eq.estatus != 'INACTIVO')
        ORDER BY e.nombre ASC
        `,
    [propertyId],
  );
  return rows;
}

export async function getChecklistSystemsByProperty(propertyId: string) {
  await ensureInitialized();
  const db = await dbPromise;
  const rows = (await db.getAllAsync(
    `
        SELECT
          COALESCE(s.id, 'sin-sistema') as sistema_id,
          COALESCE(s.nombre, 'SIN SISTEMA') as sistema_nombre,
          COALESCE(s.activo, 1) as sistema_activo,
          e.id as equipamento_id,
          e.nombre as equipamento_nombre,
          e.abreviatura as equipamento_abreviatura,
          e.frecuencia as equipamento_frecuencia,
          e.id_sistema,
          COUNT(eq.id) as equipos_count
        FROM local_equipos eq
        JOIN local_equipamentos e ON e.id = eq.id_equipamento
        LEFT JOIN local_sistemas s ON s.id = e.id_sistema
        WHERE eq.id_property = ?
          AND (eq.estatus IS NULL OR eq.estatus != ?)
        GROUP BY
          sistema_id,
          sistema_nombre,
          sistema_activo,
          e.id,
          e.nombre,
          e.abreviatura,
          e.frecuencia,
          e.id_sistema
        ORDER BY sistema_nombre ASC, e.nombre ASC
      `,
    [propertyId, 'INACTIVO'],
  )) as any[];

  const groups = new Map<
    string,
    {
      id: string;
      nombre: string;
      activo: boolean;
      equipamentos: {
        id: string;
        nombre: string;
        abreviatura: string;
        frecuencia?: string | null;
        id_sistema?: string | null;
        equipos_count: number;
      }[];
      equipos_count: number;
    }
  >();

  for (const row of rows) {
    const sistemaId = String(row.sistema_id);
    const current = groups.get(sistemaId) ?? {
      id: sistemaId,
      nombre: String(row.sistema_nombre),
      activo: row.sistema_activo === 1,
      equipamentos: [],
      equipos_count: 0,
    };
    const equiposCount = Number(row.equipos_count || 0);

    current.equipamentos.push({
      id: String(row.equipamento_id),
      nombre: String(row.equipamento_nombre),
      abreviatura: String(row.equipamento_abreviatura || ''),
      frecuencia: row.equipamento_frecuencia || null,
      id_sistema: row.id_sistema || null,
      equipos_count: equiposCount,
    });
    current.equipos_count += equiposCount;
    groups.set(sistemaId, current);
  }

  return Array.from(groups.values());
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

export interface ChecklistLaunchDataByEquipmentCode {
  buildingId: string;
  buildingName: string;
  equipamentoId: string;
  equipamentoNombre: string;
  frecuencia: string;
  equipoId: string;
  equipoCodigo: string;
  equipoUbicacion: string;
  equipoDetalleUbicacion: string | null;
}

/**
 * Resolve all checklist route params from a scanned equipment code.
 * Reads only from the local mirror so QR scanning keeps working offline.
 */
export async function getChecklistLaunchDataByEquipmentCode(
  equipoCodigo: string,
): Promise<ChecklistLaunchDataByEquipmentCode | null> {
  await ensureInitialized();

  return withLock(async () => {
    const db = await dbPromise;
    const row = (await db.getFirstAsync(
      `
        SELECT
          e.id as equipo_id,
          e.codigo as equipo_codigo,
          e.ubicacion as equipo_ubicacion,
          e.detalle_ubicacion as equipo_detalle_ubicacion,
          e.estatus as equipo_estatus,
          p.id as building_id,
          p.name as building_name,
          eq.id as equipamento_id,
          eq.nombre as equipamento_nombre,
          eq.frecuencia as equipamento_frecuencia
        FROM local_equipos e
        LEFT JOIN local_properties p ON p.id = e.id_property
        LEFT JOIN local_equipamentos eq ON eq.id = e.id_equipamento
        WHERE UPPER(e.codigo) = UPPER(?)
        LIMIT 1
      `,
      [equipoCodigo],
    )) as {
      equipo_id: string | null;
      equipo_codigo: string | null;
      equipo_ubicacion: string | null;
      equipo_detalle_ubicacion: string | null;
      equipo_estatus: string | null;
      building_id: string | null;
      building_name: string | null;
      equipamento_id: string | null;
      equipamento_nombre: string | null;
      equipamento_frecuencia: string | null;
    } | null;

    if (
      !row?.equipo_id ||
      row.equipo_estatus === 'INACTIVO' ||
      !row.building_id ||
      !row.equipamento_id
    ) {
      return null;
    }

    return {
      buildingId: row.building_id,
      buildingName: row.building_name ?? '',
      equipamentoId: row.equipamento_id,
      equipamentoNombre: row.equipamento_nombre ?? '',
      frecuencia: row.equipamento_frecuencia ?? 'MENSUAL',
      equipoId: row.equipo_id,
      equipoCodigo: row.equipo_codigo ?? '',
      equipoUbicacion: row.equipo_ubicacion ?? '',
      equipoDetalleUbicacion: row.equipo_detalle_ubicacion,
    };
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
        END as sync_status,
        COALESCE(
          (
            SELECT og_err.error_message
            FROM offline_grounding_well_checklist og_err
            WHERE og_err.maintenance_id = m.id
              AND og_err.status = 'error'
            ORDER BY og_err.created_at DESC
            LIMIT 1
          ),
          (
            SELECT om_err.error_message
            FROM offline_maintenance_response om_err
            WHERE om_err.id_mantenimiento = m.id
              AND om_err.status = 'error'
            ORDER BY om_err.created_at DESC
            LIMIT 1
          )
        ) as sync_error_message
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
      sync_error_message:
        typeof row.sync_error_message === 'string'
          ? row.sync_error_message
          : null,
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
  const db = await dbPromise;

  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM (
        SELECT
          s.id,
          s.nombre,
          s.descripcion,
          s.fecha_programada,
          s.estatus,
          s.id_property,
          s.created_by,
          s.created_at,
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

        UNION ALL

        SELECT
          m.id_sesion as id,
          COALESCE(
            MAX(s.nombre),
            MAX(p.name) || ' - ' || COALESCE(MAX(m.tipo_mantenimiento), 'Mantenimiento') || ' - ' || MIN(m.dia_programado),
            'Sesion offline'
          ) as nombre,
          MAX(s.descripcion) as descripcion,
          COALESCE(MAX(s.fecha_programada), MIN(m.dia_programado)) as fecha_programada,
          COALESCE(MAX(s.estatus), 'NO_INICIADO') as estatus,
          e.id_property,
          MAX(s.created_by) as created_by,
          MAX(s.created_at) as created_at,
          COUNT(m.id) as total_count,
          SUM(CASE WHEN m.estatus = 'FINALIZADO' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN m.estatus IN ('EN_PROGRESO', 'EN PROGRESO') THEN 1 ELSE 0 END) as in_progress_count,
          GROUP_CONCAT(DISTINCT eq.nombre) as equipment_types
        FROM local_scheduled_maintenances m
        JOIN local_equipos e ON m.id_equipo = e.id
        LEFT JOIN local_sesion_mantenimiento s ON s.id = m.id_sesion
        LEFT JOIN local_properties p ON p.id = e.id_property
        LEFT JOIN local_equipamentos eq ON e.id_equipamento = eq.id
        WHERE e.id_property = ?
          AND m.id_sesion IS NOT NULL
          AND m.id_sesion != ''
          AND NOT EXISTS (
            SELECT 1
            FROM local_sesion_mantenimiento existing_session
            WHERE existing_session.id = m.id_sesion
              AND existing_session.id_property = ?
          )
        GROUP BY m.id_sesion, e.id_property
      ) sessions
      ORDER BY fecha_programada DESC
      `,
    [propertyId, propertyId, propertyId],
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
}

export async function getInstrumentsByEquipmentType(equipmentTypeId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    return await db.getAllAsync(
      'SELECT * FROM local_instrumentos WHERE equipamento = ?',
      [equipmentTypeId],
    );
  });
}

export async function getChecklistQuestionsByEquipamento(
  equipamentoId: string,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const rows = (await db.getAllAsync(
      `
        SELECT id, equipamento_id, pregunta, orden, activa, ponderado, created_at, updated_at
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

// ─── Inventory Flow Queries ───────────────────────────────────────────────────

/**
 * Get all systems for a property, with counts of equipamentos and active equipos.
 * Includes a virtual "SIN SISTEMA" group for equipamentos without a system.
 */
export async function getInventorySystemsByProperty(propertyId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    const rows = (await db.getAllAsync(
      `
        SELECT
          COALESCE(s.id, 'sin-sistema') as sistema_id,
          COALESCE(s.nombre, 'Sin Sistema') as sistema_nombre,
          COALESCE(s.activo, 1) as sistema_activo,
          COUNT(DISTINCT e.id) as equipamentos_count,
          COUNT(DISTINCT eq.id) as equipos_count
        FROM local_equipos eq
        JOIN local_equipamentos e ON e.id = eq.id_equipamento
        LEFT JOIN local_sistemas s ON s.id = e.id_sistema
        WHERE eq.id_property = ?
          AND (eq.estatus IS NULL OR eq.estatus != 'INACTIVO')
        GROUP BY sistema_id, sistema_nombre, sistema_activo
        ORDER BY sistema_nombre ASC
      `,
      [propertyId],
    )) as any[];

    return rows.map(row => ({
      id: String(row.sistema_id),
      nombre: String(row.sistema_nombre),
      activo: row.sistema_activo === 1,
      equipamentos_count: Number(row.equipamentos_count || 0),
      equipos_count: Number(row.equipos_count || 0),
    }));
  });
}

/**
 * Get all equipamentos belonging to a specific system for a property,
 * with count of equipos of each type.
 * Pass sistemaId = 'sin-sistema' for equipamentos without a system.
 */
export async function getInventoryEquipamentosBySystem(
  propertyId: string,
  sistemaId: string,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    const isSinSistema = sistemaId === 'sin-sistema';

    const rows = (await db.getAllAsync(
      isSinSistema
        ? `
          SELECT
            e.id,
            e.nombre,
            e.abreviatura,
            e.frecuencia,
            e.id_sistema,
            COUNT(eq.id) as equipos_count
          FROM local_equipos eq
          JOIN local_equipamentos e ON e.id = eq.id_equipamento
          WHERE eq.id_property = ?
            AND (eq.estatus IS NULL OR eq.estatus != 'INACTIVO')
            AND (e.id_sistema IS NULL OR e.id_sistema = '')
          GROUP BY e.id, e.nombre, e.abreviatura, e.frecuencia, e.id_sistema
          ORDER BY e.nombre ASC
        `
        : `
          SELECT
            e.id,
            e.nombre,
            e.abreviatura,
            e.frecuencia,
            e.id_sistema,
            COUNT(eq.id) as equipos_count
          FROM local_equipos eq
          JOIN local_equipamentos e ON e.id = eq.id_equipamento
          WHERE eq.id_property = ?
            AND (eq.estatus IS NULL OR eq.estatus != 'INACTIVO')
            AND e.id_sistema = ?
          GROUP BY e.id, e.nombre, e.abreviatura, e.frecuencia, e.id_sistema
          ORDER BY e.nombre ASC
        `,
      isSinSistema ? [propertyId] : [propertyId, sistemaId],
    )) as any[];

    return rows.map(row => ({
      id: String(row.id),
      nombre: String(row.nombre),
      abreviatura: String(row.abreviatura || ''),
      frecuencia: row.frecuencia || null,
      id_sistema: row.id_sistema || null,
      equipos_count: Number(row.equipos_count || 0),
    }));
  });
}

/**
 * Get all available equipment types (equipamentos) from local mirror,
 * with their associated system name.
 */
export async function getAllInventoryEquipamentos() {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;
    const rows = (await db.getAllAsync(`
      SELECT 
        e.id as equipamento_id,
        e.nombre as equipamento_nombre,
        e.abreviatura as equipamento_abreviatura,
        e.frecuencia as equipamento_frecuencia,
        e.id_sistema,
        COALESCE(s.nombre, 'Sin Sistema') as sistema_nombre,
        COALESCE(s.activo, 1) as sistema_activo
      FROM local_equipamentos e
      LEFT JOIN local_sistemas s ON s.id = e.id_sistema
      ORDER BY sistema_nombre ASC, e.nombre ASC
    `)) as any[];

    return rows.map(row => ({
      id: String(row.equipamento_id),
      nombre: String(row.equipamento_nombre),
      abreviatura: String(row.equipamento_abreviatura || ''),
      frecuencia: row.equipamento_frecuencia || null,
      id_sistema: row.id_sistema || null,
      sistema_nombre: String(row.sistema_nombre),
      sistema_activo: row.sistema_activo === 1,
    }));
  });
}

/**
 * Get all equipos for a specific equipamento type within a property.
 * Returns equipment_detail parsed from JSON.
 * Includes all statuses (ACTIVO and INACTIVO) for the inventory view.
 */
export async function getInventoryEquiposByEquipamento(
  propertyId: string,
  equipamentoId?: string,
) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    const isAll = !equipamentoId || equipamentoId === 'all';
    const query = `
        SELECT
          eq.id,
          eq.id_property,
          eq.id_equipamento,
          eq.codigo,
          eq.ubicacion,
          eq.detalle_ubicacion,
          eq.estatus,
          eq.equipment_detail,
          eq.config,
          e.nombre as equipamento_nombre,
          e.abreviatura as equipamento_abreviatura,
          s.nombre as sistema_nombre
        FROM local_equipos eq
        JOIN local_equipamentos e ON e.id = eq.id_equipamento
        LEFT JOIN local_sistemas s ON s.id = e.id_sistema
        WHERE eq.id_property = ?
          ${isAll ? '' : 'AND eq.id_equipamento = ?'}
        ORDER BY eq.codigo ASC
      `;
    const params = isAll ? [propertyId] : [propertyId, equipamentoId];

    const rows = (await db.getAllAsync(query, params)) as any[];

    return rows.map(row => {
      let equipment_detail: Record<string, unknown> | null = null;
      try {
        equipment_detail = row.equipment_detail
          ? JSON.parse(row.equipment_detail)
          : null;
      } catch {
        equipment_detail = null;
      }

      return {
        id: String(row.id),
        id_property: String(row.id_property),
        id_equipamento: String(row.id_equipamento),
        codigo: String(row.codigo || ''),
        ubicacion: String(row.ubicacion || ''),
        detalle_ubicacion: row.detalle_ubicacion || null,
        estatus: String(row.estatus || 'ACTIVO'),
        equipment_detail,
        config: row.config === 1,
        equipamento_nombre: row.equipamento_nombre || null,
        equipamento_abreviatura: row.equipamento_abreviatura || null,
        sistema_nombre: row.sistema_nombre || null,
      };
    });
  });
}

/**
 * Get a single equipo by ID from local mirror, with all detail parsed.
 * Used by the equipment hub screen.
 */
export async function getInventoryEquipoById(equipoId: string) {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    const row = (await db.getFirstAsync(
      `
        SELECT
          eq.id,
          eq.id_property,
          eq.id_equipamento,
          eq.codigo,
          eq.ubicacion,
          eq.detalle_ubicacion,
          eq.estatus,
          eq.equipment_detail,
          eq.config,
          e.nombre as equipamento_nombre,
          e.abreviatura as equipamento_abreviatura,
          e.frecuencia as equipamento_frecuencia,
          s.nombre as sistema_nombre,
          p.name as property_name
        FROM local_equipos eq
        JOIN local_equipamentos e ON e.id = eq.id_equipamento
        LEFT JOIN local_sistemas s ON s.id = e.id_sistema
        LEFT JOIN local_properties p ON p.id = eq.id_property
        WHERE eq.id = ?
        LIMIT 1
      `,
      [equipoId],
    )) as any | null;

    if (!row) return null;

    let equipment_detail: Record<string, unknown> | null = null;
    try {
      equipment_detail = row.equipment_detail
        ? JSON.parse(row.equipment_detail)
        : null;
    } catch {
      equipment_detail = null;
    }

    return {
      id: String(row.id),
      id_property: String(row.id_property),
      id_equipamento: String(row.id_equipamento),
      codigo: String(row.codigo || ''),
      ubicacion: String(row.ubicacion || ''),
      detalle_ubicacion: row.detalle_ubicacion || null,
      estatus: String(row.estatus || 'ACTIVO'),
      equipment_detail,
      config: row.config === 1,
      equipamento_nombre: row.equipamento_nombre || null,
      equipamento_abreviatura: row.equipamento_abreviatura || null,
      equipamento_frecuencia: row.equipamento_frecuencia || null,
      sistema_nombre: row.sistema_nombre || null,
      property_name: row.property_name || null,
    };
  });
}
