import type { InventoryEquipo } from '@/types/inventory';

/**
 * Extrae el Tipo de un equipo desde su `equipment_detail` o `equipamento_nombre`.
 */
export function extractEquipoTipo(
  detail?: Record<string, unknown> | null,
  fallbackEquipamentoNombre?: string | null,
): string | null {
  if (detail && typeof detail === 'object') {
    const raw =
      detail.tipo ??
      detail.tipo_bomba ??
      detail.tipo_tablero ??
      detail.tipo_transferencia ??
      detail.tipo_ventilador ??
      detail.tipo_compresor ??
      detail.tipo_subestacion ??
      detail.tipo_puerta;

    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
  }

  if (
    fallbackEquipamentoNombre &&
    fallbackEquipamentoNombre.trim().length > 0
  ) {
    return fallbackEquipamentoNombre.trim();
  }

  return null;
}

/**
 * Extrae el Subtipo de un equipo desde su `equipment_detail`.
 */
export function extractEquipoSubtipo(
  detail?: Record<string, unknown> | null,
): string | null {
  if (!detail || typeof detail !== 'object') return null;

  // Claves explícitas de subtipo
  const explicitSubtipo =
    detail.subtipo ?? detail.sub_tipo ?? detail.sub_tipo_equipo;

  if (
    typeof explicitSubtipo === 'string' &&
    explicitSubtipo.trim().length > 0
  ) {
    return explicitSubtipo.trim();
  }

  const mainTipo = typeof detail.tipo === 'string' ? detail.tipo.trim() : null;

  // Alternativas basadas en campos secundarios si `tipo` principal está presente
  if (mainTipo) {
    if (
      typeof detail.tipo_bomba === 'string' &&
      detail.tipo_bomba.trim().length > 0 &&
      detail.tipo_bomba.trim() !== mainTipo
    ) {
      return detail.tipo_bomba.trim();
    }

    if (
      typeof detail.tipo_compresor === 'string' &&
      detail.tipo_compresor.trim().length > 0 &&
      detail.tipo_compresor.trim() !== mainTipo
    ) {
      return detail.tipo_compresor.trim();
    }

    if (
      typeof detail.tipo_refrigerante === 'string' &&
      detail.tipo_refrigerante.trim().length > 0
    ) {
      return detail.tipo_refrigerante.trim();
    }
  }

  return null;
}

/**
 * Obtiene la lista única y ordenada de Tipos presentes en un conjunto de equipos.
 */
export function getDistinctTipos(equipos: InventoryEquipo[]): string[] {
  const typesSet = new Set<string>();
  for (const eq of equipos) {
    const t = extractEquipoTipo(eq.equipment_detail, eq.equipamento_nombre);
    if (t) {
      typesSet.add(t);
    }
  }
  return Array.from(typesSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Obtiene la lista única y ordenada de Subtipos presentes en un conjunto de equipos,
 * opcionalmente filtrados por el Tipo seleccionado.
 */
export function getDistinctSubtipos(
  equipos: InventoryEquipo[],
  selectedTipo?: string,
): string[] {
  const subtypesSet = new Set<string>();
  for (const eq of equipos) {
    if (selectedTipo) {
      const eqTipo = extractEquipoTipo(
        eq.equipment_detail,
        eq.equipamento_nombre,
      );
      if (eqTipo !== selectedTipo) {
        continue;
      }
    }
    const st = extractEquipoSubtipo(eq.equipment_detail);
    if (st) {
      subtypesSet.add(st);
    }
  }
  return Array.from(subtypesSet).sort((a, b) => a.localeCompare(b));
}
