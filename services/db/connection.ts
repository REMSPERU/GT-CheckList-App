import * as SQLite from 'expo-sqlite';

export const dbPromise = SQLite.openDatabaseAsync('offline_maintenance.db');

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
    return await fn();
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
          city TEXT
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
          abreviatura TEXT
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
