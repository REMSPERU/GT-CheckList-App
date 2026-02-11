/**
 * Equipment Routes Configuration
 *
 * Maps equipment types (from equipamentos table) to their execution flow routes.
 * Add new equipment types here as they are implemented.
 */

export type EquipmentType =
  | 'Tablero Electrico'
  | 'Luces de Emergencia'
  | string;

export interface EquipmentRouteConfig {
  /** The route path for this equipment's execution flow */
  route: string;
  /** Whether the equipment type has been fully implemented */
  implemented: boolean;
}

/**
 * Equipment type to execution route mapping.
 * The key should match the `nombre` field from the `equipamentos` table.
 */
export const EQUIPMENT_ROUTES: Record<string, EquipmentRouteConfig> = {
  'Tablero Electrico': {
    route: '/maintenance/execution/electrical-panel/pre-photos',
    implemented: true,
  },
  'Luces de Emergencia': {
    route: '/maintenance/execution/emergency-lights/checklist',
    implemented: true,
  },
  'Pozo a Tierra': {
    route: '/maintenance/execution/grounding-well/checklist',
    implemented: true,
  },
};

/**
 * Default route for unknown equipment types.
 * Falls back to the electrical panel flow.
 */
export const DEFAULT_EQUIPMENT_ROUTE: EquipmentRouteConfig = {
  route: '/maintenance/execution/electrical-panel/pre-photos',
  implemented: false,
};

/**
 * Get the execution route for a given equipment type.
 * @param equipmentType - The equipment type name (from equipamentos.nombre)
 * @returns The route configuration for this equipment type
 */
export function getEquipmentRoute(
  equipmentType: string | undefined | null,
): EquipmentRouteConfig {
  if (!equipmentType) {
    return DEFAULT_EQUIPMENT_ROUTE;
  }
  return EQUIPMENT_ROUTES[equipmentType] || DEFAULT_EQUIPMENT_ROUTE;
}
