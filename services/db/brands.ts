import { dbPromise, ensureInitialized } from './connection';

export interface BrandDbRow {
  id: string;
  nombre: string;
}

/**
 * Consulta SQLite local para obtener las marcas vinculadas a un tipo de equipo (id_equipamento).
 * Si no se especifica el id_equipamento, retorna todas las marcas.
 */
export async function getLocalBrandsForEquipment(
  equipamentoId?: string | null,
): Promise<BrandDbRow[]> {
  await ensureInitialized();
  const db = await dbPromise;

  if (!equipamentoId) {
    return db.getAllAsync<BrandDbRow>(
      `SELECT id, nombre FROM local_marca ORDER BY nombre ASC`,
    );
  }

  // Obtener las marcas asociadas a este tipo de equipo
  return db.getAllAsync<BrandDbRow>(
    `SELECT m.id, m.nombre 
     FROM local_marca m
     JOIN local_equipos_marcas em ON m.id = em.id_marca
     WHERE em.id_equipamento = ?
     ORDER BY m.nombre ASC`,
    [equipamentoId],
  );
}
