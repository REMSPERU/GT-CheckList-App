import * as SQLite from 'expo-sqlite';

const dbPromise = SQLite.openDatabaseAsync('offline_maintenance.db');

export const DatabaseService = {
  initializationPromise: null as Promise<void> | null,

  async initDatabase() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
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
            last_name TEXT
          );


          CREATE TABLE IF NOT EXISTS local_equipamentos (
            id TEXT PRIMARY KEY,
            nombre TEXT,
            abreviatura TEXT
          );

          CREATE TABLE IF NOT EXISTS local_equipamentos_property (
            id_equipamentos TEXT,
            id_property TEXT,
            PRIMARY KEY (id_equipamentos, id_property)
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
        `);
      console.log('Database initialized');
    })();

    return this.initializationPromise;
  },

  async ensureInitialized() {
    if (!this.initializationPromise) {
      await this.initDatabase();
    }
    await this.initializationPromise;
  },

  async clearMirrorTables() {
    await this.ensureInitialized();
    const db = await dbPromise;
    await db.execAsync(`
      DELETE FROM local_equipos;
      DELETE FROM local_properties;
      DELETE FROM local_users;
      DELETE FROM local_equipamentos;
      DELETE FROM local_equipamentos_property;
      DELETE FROM offline_panel_configurations;
    `);
  },

  async bulkInsertMirrorData(
    equipos: any[],
    properties: any[],
    users: any[],
    equipamentos: any[] = [],
    equipamentosProperty: any[] = [],
  ) {
    const db = await dbPromise;

    // Use transactions for bulk inserts
    await db.withTransactionAsync(async () => {
      // Equipos
      for (const item of equipos) {
        await db.runAsync(
          'INSERT OR REPLACE INTO local_equipos (id, id_property, id_equipamento, codigo, ubicacion, estatus, equipment_detail, config, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            item.id,
            item.id_property,
            item.id_equipamento,
            item.codigo,
            item.ubicacion,
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
  },

  async saveOfflineMaintenance(
    userId: string,
    maintenanceId: string | null,
    detailMaintenance: any,
    photos: {
      uri: string;
      type: string;
      category?: string;
      observationKey?: string;
    }[],
  ) {
    const db = await dbPromise;
    let localId: number | null = null;

    await db.withTransactionAsync(async () => {
      // 1. Insert Maintenance Record
      const result = await db.runAsync(
        `INSERT INTO offline_maintenance_response (id_mantenimiento, user_created, detail_maintenance, status)
         VALUES (?, ?, ?, 'pending')`,
        [maintenanceId, userId, JSON.stringify(detailMaintenance)],
      );
      localId = result.lastInsertRowId;

      // 2. Insert Photos
      for (const photo of photos) {
        await db.runAsync(
          `INSERT INTO offline_photos (maintenance_local_id, local_uri, type, category, observation_key, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [
            localId,
            photo.uri,
            photo.type,
            photo.category || null,
            photo.observationKey || null,
          ],
        );
      }
    });

    return localId;
  },

  async saveOfflinePanelConfiguration(panelId: string, configurationData: any) {
    await this.ensureInitialized();
    const db = await dbPromise;
    const jsonConfig = JSON.stringify(configurationData);

    await db.withTransactionAsync(async () => {
      // 1. Queue configuration for sync
      await db.runAsync(
        `INSERT INTO offline_panel_configurations (panel_id, configuration_data, status)
         VALUES (?, ?, 'pending')`,
        [panelId, jsonConfig],
      );

      // 2. Update local mirror immediately aka "optimistic update"
      // This ensures the user sees the panel as configured even if offline
      await db.runAsync(
        `UPDATE local_equipos
         SET equipment_detail = ?, config = 1, last_synced_at = ?
         WHERE id = ?`,
        [jsonConfig, new Date().toISOString(), panelId],
      );
    });
  },

  async getPendingPanelConfigurations() {
    await this.ensureInitialized();
    const db = await dbPromise;
    return await db.getAllAsync(`
      SELECT * FROM offline_panel_configurations WHERE status = 'pending' OR status = 'error'
    `);
  },

  async updatePanelConfigurationStatus(
    id: number,
    status: string,
    errorMessage: string | null = null,
  ) {
    await this.ensureInitialized();
    const db = await dbPromise;
    const now = status === 'synced' ? new Date().toISOString() : null;
    await db.runAsync(
      `UPDATE offline_panel_configurations SET status = ?, error_message = ?, synced_at = ? WHERE id = ?`,
      [status, errorMessage, now, id],
    );
  },

  async getPendingMaintenances() {
    await this.ensureInitialized();
    const db = await dbPromise;
    // Get headers
    const rows = await db.getAllAsync(`
      SELECT * FROM offline_maintenance_response WHERE status = 'pending' OR status = 'error'
    `);

    return rows;
  },

  async getPendingPhotos(maintenanceLocalId: number) {
    await this.ensureInitialized();
    const db = await dbPromise;
    const rows = await db.getAllAsync(
      `
      SELECT * FROM offline_photos WHERE maintenance_local_id = ? AND status != 'synced'
    `,
      [maintenanceLocalId],
    );
    return rows;
  },

  async updatePhotoStatus(
    photoId: number,
    status: string,
    remoteUrl: string | null = null,
    errorMessage: string | null = null,
  ) {
    await this.ensureInitialized();
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE offline_photos SET status = ?, remote_url = ?, error_message = ? WHERE id = ?`,
      [status, remoteUrl, errorMessage, photoId],
    );
  },

  async updateMaintenanceStatus(
    localId: number,
    status: string,
    errorMessage: string | null = null,
  ) {
    await this.ensureInitialized();
    const db = await dbPromise;
    const now = status === 'synced' ? new Date().toISOString() : null;
    await db.runAsync(
      `UPDATE offline_maintenance_response SET status = ?, error_message = ?, synced_at = ? WHERE local_id = ?`,
      [status, errorMessage, now, localId],
    );
  },

  // --- READ METHODS FOR UI ---
  async getLocalEquipments() {
    await this.ensureInitialized();
    const db = await dbPromise;
    return await db.getAllAsync('SELECT * FROM local_equipos');
  },

  async getLocalProperties() {
    await this.ensureInitialized();
    const db = await dbPromise;
    return await db.getAllAsync('SELECT * FROM local_properties');
  },

  async getEquipamentosByProperty(propertyId: string) {
    await this.ensureInitialized();
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
  },

  async saveCurrentUser(user: {
    id: string;
    username?: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }) {
    await this.ensureInitialized();
    const db = await dbPromise;
    await db.runAsync(
      'INSERT OR REPLACE INTO local_users (id, username, email, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [
        user.id,
        user.username || user.email?.split('@')[0] || '',
        user.email,
        user.first_name || '',
        user.last_name || '',
      ],
    );
    console.log('Current user saved to local DB:', user.email);
  },

  async getLocalUserById(id: string) {
    await this.ensureInitialized();
    const db = await dbPromise;
    const result = await db.getFirstAsync(
      'SELECT * FROM local_users WHERE id = ?',
      [id],
    );
    return result;
  },

  async getElectricalPanelsByProperty(
    propertyId: string,
    filters?: {
      type?: string;
      search?: string;
      config?: boolean | null;
      locations?: string[];
      equipamentoId?: string; // Filter by equipment type (e.g., TBELEC id)
    },
  ) {
    await this.ensureInitialized();
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
  },
};
