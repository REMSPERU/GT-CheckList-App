import * as SQLite from 'expo-sqlite';

export const dbPromise = SQLite.openDatabaseAsync('offline_maintenance.db');

const SQLITE_BUSY_MAX_RETRIES = 5;
const SQLITE_BUSY_BASE_DELAY_MS = 120;

function isSqliteBusyError(error: unknown) {
  if (!error) return false;
  const message = String((error as { message?: string }).message || error)
    .toLowerCase()
    .trim();

  return (
    message.includes('database is locked') ||
    message.includes('database busy') ||
    message.includes('sqlstate 5')
  );
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple mutex to prevent concurrent transactions
let transactionLock: Promise<void> = Promise.resolve();

export const withLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const previousLock = transactionLock;
  let resolve: () => void;
  transactionLock = new Promise(r => {
    resolve = r;
  });
  try {
    await previousLock;

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        const shouldRetry =
          isSqliteBusyError(error) && attempt < SQLITE_BUSY_MAX_RETRIES;

        if (!shouldRetry) {
          throw error;
        }

        const delay = SQLITE_BUSY_BASE_DELAY_MS * (attempt + 1);
        if (__DEV__) {
          console.warn(
            `[DB] SQLITE_BUSY retry ${attempt + 1}/${SQLITE_BUSY_MAX_RETRIES} in ${delay}ms`,
          );
        }
        await sleep(delay);
      }
    }
  } finally {
    resolve!();
  }
};

let initializationPromise: Promise<void> | null = null;

export async function initDatabase() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const db = await dbPromise;
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 8000;
        PRAGMA synchronous = NORMAL;
        
        -- Mirror Tables (Read-Only Offline)
        CREATE TABLE IF NOT EXISTS local_equipos (
          id TEXT PRIMARY KEY,
          id_property TEXT,
          id_equipamento TEXT,
          codigo TEXT,
          ubicacion TEXT,
          detalle_ubicacion TEXT,
          estatus TEXT,
          equipment_detail TEXT, -- JSON string
          config INTEGER,
          last_synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS local_properties (
          id TEXT PRIMARY KEY,
          name TEXT,
          code TEXT,
          address TEXT,
          city TEXT,
          image_url TEXT
        );
        
        CREATE TABLE IF NOT EXISTS local_users (
          id TEXT PRIMARY KEY,
          username TEXT,
          email TEXT,
          first_name TEXT,
          last_name TEXT,
          role TEXT
        );

        CREATE TABLE IF NOT EXISTS app_session (
          user_id TEXT PRIMARY KEY,
          access_token TEXT,
          refresh_token TEXT,
          user_metadata TEXT, -- JSON string
          expires_at INTEGER,
          last_active TEXT
        );


        CREATE TABLE IF NOT EXISTS local_equipamentos (
          id TEXT PRIMARY KEY,
          nombre TEXT,
          abreviatura TEXT,
          frecuencia TEXT
        );

        CREATE TABLE IF NOT EXISTS local_preguntas_equipamento (
          id TEXT PRIMARY KEY,
          equipamento_id TEXT,
          pregunta TEXT,
          orden INTEGER,
          activa INTEGER,
          created_at TEXT,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS local_instrumentos (
          id TEXT PRIMARY KEY,
          instrumento TEXT,
          marca TEXT,
          modelo TEXT,
          serie TEXT,
          equipamento TEXT
        );

        CREATE TABLE IF NOT EXISTS local_equipamentos_property (
          id_equipamentos TEXT,
          id_property TEXT,
          PRIMARY KEY (id_equipamentos, id_property)
        );

        CREATE TABLE IF NOT EXISTS local_user_properties (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          property_id TEXT,
          property_role TEXT,
          expires_at TEXT,
          assigned_at TEXT,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS local_audit_questions (
          id TEXT PRIMARY KEY,
          question_code TEXT,
          question_text TEXT,
          order_index INTEGER,
          section_id TEXT,
          section_name TEXT,
          section_order_index INTEGER,
          is_active INTEGER,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS local_scheduled_maintenances (
          id TEXT PRIMARY KEY,
          dia_programado TEXT,
          tipo_mantenimiento TEXT,
          observations TEXT,
          id_equipo TEXT,
          estatus TEXT,
          codigo TEXT,
          id_sesion TEXT,
          assigned_technicians TEXT, -- JSON string of user IDs
          last_synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS local_sesion_mantenimiento (
          id TEXT PRIMARY KEY,
          nombre TEXT,
          descripcion TEXT,
          fecha_programada TEXT,
          estatus TEXT,
          id_property TEXT,
          created_by TEXT,
          created_at TEXT,
          last_synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS local_user_sesion_mantenimiento (
          id_user TEXT,
          id_sesion TEXT,
          PRIMARY KEY (id_user, id_sesion)
        );

        -- Offline Work (Write-Sync)
        CREATE TABLE IF NOT EXISTS offline_maintenance_response (
          local_id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_mantenimiento TEXT, -- Can be null for adhoc
          user_created TEXT,
          detail_maintenance TEXT, -- JSON string
          status TEXT DEFAULT 'pending', -- pending, syncing, synced, error
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS offline_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          maintenance_local_id INTEGER,
          local_uri TEXT,
          type TEXT, -- pre, post, observation
          category TEXT, -- visual, thermo
          observation_key TEXT, -- for item observations
          status TEXT DEFAULT 'pending',
          remote_url TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(maintenance_local_id) REFERENCES offline_maintenance_response(local_id)
        );

        CREATE TABLE IF NOT EXISTS offline_panel_configurations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          panel_id TEXT,
          configuration_data TEXT, -- JSON string
          status TEXT DEFAULT 'pending', -- pending, syncing, synced, error
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS offline_grounding_well_checklist (
          local_id INTEGER PRIMARY KEY AUTOINCREMENT,
          panel_id TEXT,
          maintenance_id TEXT, -- Can be null for adhoc
          user_created TEXT,
          checklist_data TEXT, -- JSON string
          status TEXT DEFAULT 'pending', -- pending, syncing, synced, error
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS offline_grounding_well_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          checklist_local_id INTEGER,
          item_key TEXT, -- e.g., 'lidStatus', 'hasSignage', 'connectorsOk', 'hasAccess'
          local_uri TEXT,
          status TEXT DEFAULT 'pending', -- pending, syncing, synced, error
          remote_url TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(checklist_local_id) REFERENCES offline_grounding_well_checklist(local_id)
        );

        -- Session-level photos (offline queue for sync)
        CREATE TABLE IF NOT EXISTS offline_sesion_fotos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_sesion TEXT NOT NULL,
          local_uri TEXT NOT NULL,
          tipo TEXT DEFAULT 'inicio',
          created_by TEXT,
          status TEXT DEFAULT 'pending',
          remote_url TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Session-level photos (mirror from Supabase)
        CREATE TABLE IF NOT EXISTS local_sesion_fotos (
          id TEXT PRIMARY KEY,
          id_sesion TEXT NOT NULL,
          foto_url TEXT NOT NULL,
          tipo TEXT DEFAULT 'inicio',
          created_by TEXT,
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS offline_audit_sessions (
          local_id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_submission_id TEXT NOT NULL UNIQUE,
          property_id TEXT NOT NULL,
          auditor_id TEXT NOT NULL,
          created_by TEXT,
          scheduled_for TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TEXT,
          submitted_at TEXT,
          audit_payload TEXT,
          summary TEXT,
          sync_status TEXT DEFAULT 'pending',
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced_at TEXT
        );

        -- Performance indexes for frequent offline-first queries
        CREATE INDEX IF NOT EXISTS idx_local_equipos_property ON local_equipos(id_property);
        CREATE INDEX IF NOT EXISTS idx_local_equipos_equipamento ON local_equipos(id_equipamento);
        CREATE INDEX IF NOT EXISTS idx_local_equipos_codigo ON local_equipos(codigo);
        CREATE INDEX IF NOT EXISTS idx_local_equipos_ubicacion ON local_equipos(ubicacion);
        CREATE INDEX IF NOT EXISTS idx_local_equipos_estatus ON local_equipos(estatus);

        CREATE INDEX IF NOT EXISTS idx_local_sched_equipo ON local_scheduled_maintenances(id_equipo);
        CREATE INDEX IF NOT EXISTS idx_local_sched_session ON local_scheduled_maintenances(id_sesion);
        CREATE INDEX IF NOT EXISTS idx_local_sched_status ON local_scheduled_maintenances(estatus);
        CREATE INDEX IF NOT EXISTS idx_local_sched_date ON local_scheduled_maintenances(dia_programado);

        CREATE INDEX IF NOT EXISTS idx_local_session_property ON local_sesion_mantenimiento(id_property);
        CREATE INDEX IF NOT EXISTS idx_local_session_date ON local_sesion_mantenimiento(fecha_programada);

        CREATE INDEX IF NOT EXISTS idx_local_user_session_session ON local_user_sesion_mantenimiento(id_sesion);
        CREATE INDEX IF NOT EXISTS idx_local_user_session_user ON local_user_sesion_mantenimiento(id_user);

        CREATE INDEX IF NOT EXISTS idx_local_instrumentos_equipamento ON local_instrumentos(equipamento);
        CREATE INDEX IF NOT EXISTS idx_local_equipamentos_property_property ON local_equipamentos_property(id_property);
        CREATE INDEX IF NOT EXISTS idx_local_preguntas_equipamento_equipamento ON local_preguntas_equipamento(equipamento_id);
        CREATE INDEX IF NOT EXISTS idx_local_preguntas_equipamento_activa ON local_preguntas_equipamento(activa);
        CREATE INDEX IF NOT EXISTS idx_local_user_properties_user ON local_user_properties(user_id);
        CREATE INDEX IF NOT EXISTS idx_local_user_properties_property ON local_user_properties(property_id);
        CREATE INDEX IF NOT EXISTS idx_local_audit_questions_active_order ON local_audit_questions(is_active, order_index);

        CREATE INDEX IF NOT EXISTS idx_offline_maint_status ON offline_maintenance_response(status);
        CREATE INDEX IF NOT EXISTS idx_offline_maint_created ON offline_maintenance_response(created_at);
        CREATE INDEX IF NOT EXISTS idx_offline_photo_maint_status ON offline_photos(maintenance_local_id, status);

        CREATE INDEX IF NOT EXISTS idx_offline_panel_status ON offline_panel_configurations(status);
        CREATE INDEX IF NOT EXISTS idx_offline_panel_panel_status ON offline_panel_configurations(panel_id, status);
        CREATE INDEX IF NOT EXISTS idx_offline_audit_sync_status ON offline_audit_sessions(sync_status);
        CREATE INDEX IF NOT EXISTS idx_offline_audit_property_date ON offline_audit_sessions(property_id, scheduled_for);

        CREATE INDEX IF NOT EXISTS idx_offline_gw_status ON offline_grounding_well_checklist(status);
        CREATE INDEX IF NOT EXISTS idx_offline_gw_maint ON offline_grounding_well_checklist(maintenance_id);
        CREATE INDEX IF NOT EXISTS idx_offline_gw_photo_checklist_status ON offline_grounding_well_photos(checklist_local_id, status);

        CREATE INDEX IF NOT EXISTS idx_offline_session_photo_session_status ON offline_sesion_fotos(id_sesion, status);
        CREATE INDEX IF NOT EXISTS idx_local_session_photo_session_date ON local_sesion_fotos(id_sesion, created_at);
      `);

    // === MIGRATIONS ===
    // These run every time but only affect existing DBs that need changes

    // Migration v1.1: Add role column to local_users (for users updating from older versions)
    try {
      await db.execAsync(`ALTER TABLE local_users ADD COLUMN role TEXT;`);
      console.log('Migration: Added role column to local_users');
    } catch {
      // Column already exists - this is expected for new installs or already-migrated DBs
    }

    // Migration v1.2: Add detalle_ubicacion column to local_equipos
    try {
      await db.execAsync(
        `ALTER TABLE local_equipos ADD COLUMN detalle_ubicacion TEXT;`,
      );
      console.log('Migration: Added detalle_ubicacion column to local_equipos');
    } catch {
      // Column already exists - this is expected for new installs or already-migrated DBs
    }

    // Migration v1.3: Add protocol column to offline_maintenance_response
    try {
      await db.execAsync(
        `ALTER TABLE offline_maintenance_response ADD COLUMN protocol TEXT;`,
      );
      console.log(
        'Migration: Added protocol column to offline_maintenance_response',
      );
    } catch {
      // Column already exists
    }

    // Migration v1.4: Add id_sesion column to local_scheduled_maintenances
    try {
      await db.execAsync(
        `ALTER TABLE local_scheduled_maintenances ADD COLUMN id_sesion TEXT;`,
      );
      console.log(
        'Migration: Added id_sesion column to local_scheduled_maintenances',
      );
    } catch {
      // Column already exists (new installs or already-migrated DBs)
    }

    // Migration v1.5: Add frecuencia column to local_equipamentos
    try {
      await db.execAsync(
        `ALTER TABLE local_equipamentos ADD COLUMN frecuencia TEXT;`,
      );
      console.log('Migration: Added frecuencia column to local_equipamentos');
    } catch {
      // Column already exists
    }

    // Migration v1.6: Ensure local_preguntas_equipamento exists for checklist
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS local_preguntas_equipamento (
          id TEXT PRIMARY KEY,
          equipamento_id TEXT,
          pregunta TEXT,
          orden INTEGER,
          activa INTEGER,
          created_at TEXT,
          updated_at TEXT
        );
      `);
    } catch {
      // Table already exists
    }

    // Migration v1.7: Add image_url column to local_properties
    try {
      await db.execAsync(
        `ALTER TABLE local_properties ADD COLUMN image_url TEXT;`,
      );
      console.log('Migration: Added image_url column to local_properties');
    } catch {
      // Column already exists
    }

    // Migration v1.8: Add audit question section metadata
    try {
      await db.execAsync(
        `ALTER TABLE local_audit_questions ADD COLUMN section_id TEXT;`,
      );
      console.log('Migration: Added section_id to local_audit_questions');
    } catch {
      // Column already exists
    }

    try {
      await db.execAsync(
        `ALTER TABLE local_audit_questions ADD COLUMN section_name TEXT;`,
      );
      console.log('Migration: Added section_name to local_audit_questions');
    } catch {
      // Column already exists
    }

    try {
      await db.execAsync(
        `ALTER TABLE local_audit_questions ADD COLUMN section_order_index INTEGER;`,
      );
      console.log(
        'Migration: Added section_order_index to local_audit_questions',
      );
    } catch {
      // Column already exists
    }

    try {
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_local_audit_questions_section_order ON local_audit_questions(is_active, section_order_index, order_index);',
      );
    } catch {
      // Index already exists
    }

    console.log('Database initialized');
  })();

  return initializationPromise;
}

export async function ensureInitialized() {
  if (!initializationPromise) {
    await initDatabase();
  }
  await initializationPromise;
}
