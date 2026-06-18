import { dbPromise, withLock, ensureInitialized } from './connection';
import { saveOfflineEquipment } from './equipment-offline';
import { syncQueue } from '../sync-queue';

export interface CreateEquipmentData {
  id_property: string;
  id_equipamento: string;
  codigo: string;
  ubicacion: string;
  detalle_ubicacion?: string;
  estatus?: string;
  equipment_detail?: Record<string, unknown>;
  config?: boolean;
}

export interface UpdateEquipmentData {
  ubicacion?: string;
  detalle_ubicacion?: string | null;
  estatus?: string;
  equipment_detail?: Record<string, unknown> | null;
  config?: boolean;
}

/**
 * Create a new equipment entry in SQLite and queue for background sync
 */
export async function createEquipment(data: CreateEquipmentData) {
  // Generate client-side UUID v4
  const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  const equipmentData = {
    id_property: data.id_property,
    id_equipamento: data.id_equipamento,
    codigo: data.codigo,
    ubicacion: data.ubicacion,
    detalle_ubicacion: data.detalle_ubicacion || null,
    estatus: data.estatus || 'ACTIVO',
    equipment_detail: data.equipment_detail || {},
    config: data.config ?? false,
  };

  await saveOfflineEquipment('create', id, equipmentData);
  syncQueue.enqueue(id, 'equipo');

  return {
    id,
    ...equipmentData,
  };
}

/**
 * Update an equipment entry in SQLite and queue for background sync
 */
export async function updateEquipment(id: string, data: UpdateEquipmentData) {
  await saveOfflineEquipment('update', id, data);
  syncQueue.enqueue(id, 'equipo');

  return {
    id,
    ...data,
  };
}

/**
 * Soft-delete equipment by setting status to INACTIVO offline
 */
export async function softDeleteEquipment(id: string) {
  await updateEquipment(id, { estatus: 'INACTIVO' });
}

/**
 * Generate next equipment code based on prefix and existing codes in local and offline database
 */
export async function generateEquipmentCode(
  propertyId: string,
  prefix: string = 'LE',
): Promise<string> {
  await ensureInitialized();
  return withLock(async () => {
    const db = await dbPromise;

    // Fetch property code from local_properties to include it in the generated code
    const property = await db.getFirstAsync<{ code: string }>(
      `SELECT code FROM local_properties WHERE id = ?`,
      [propertyId]
    );

    const propertyCode = property?.code ? property.code.toUpperCase().trim() : '';
    const equipmentAbbr = prefix.toUpperCase().trim();
    // Format: "ABREVIATURAEDIFICIO-ABREVIATURAEQUIPO-" (e.g. "BACHC-LEU-") or "ABREVIATURAEQUIPO-" if property code is missing
    const combinedPrefix = propertyCode ? `${propertyCode}-${equipmentAbbr}-` : `${equipmentAbbr}-`;

    // 1. Get all codes matching this prefix from local_equipos
    const localCodes = await db.getAllAsync<{ codigo: string }>(
      `SELECT codigo FROM local_equipos 
       WHERE id_property = ? AND codigo LIKE ?`,
      [propertyId, `${combinedPrefix}%`]
    );

    // 2. Get all codes matching this prefix from offline_equipos (pending creates)
    const offlineCodes = await db.getAllAsync<{ codigo: string }>(
      `SELECT codigo FROM offline_equipos 
       WHERE id_property = ? AND action = 'create' AND codigo LIKE ?`,
      [propertyId, `${combinedPrefix}%`]
    );

    const allCodes = [...localCodes, ...offlineCodes].map(c => c.codigo);

    let maxNum = 0;
    for (const code of allCodes) {
      const match = code.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${combinedPrefix}${String(nextNum).padStart(3, '0')}`;
  });
}
