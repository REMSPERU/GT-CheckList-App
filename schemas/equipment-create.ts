import { z } from 'zod';

/**
 * Schema de validación para crear un equipo nuevo.
 * Los campos base son comunes a todos los equipos.
 * Los campos técnicos se validan como objeto libre (JSONB).
 */

// Ubicaciones disponibles
export const UBICACION_OPTIONS = [
  { label: 'Azotea', value: 'AZOTEA' },
  { label: 'Semisótano', value: 'SEMISOTANO' },
  { label: 'Piso 1', value: '1' },
  { label: 'Piso 2', value: '2' },
  { label: 'Piso 3', value: '3' },
  { label: 'Piso 4', value: '4' },
  { label: 'Piso 5', value: '5' },
  { label: 'Piso 6', value: '6' },
  { label: 'Piso 7', value: '7' },
  { label: 'Piso 8', value: '8' },
  { label: 'Piso 9', value: '9' },
  { label: 'Piso 10', value: '10' },
  { label: 'Sótano 1', value: '-S1' },
  { label: 'Sótano 2', value: '-S2' },
  { label: 'Sótano 3', value: '-S3' },
] as const;

export const ESTATUS_OPTIONS = [
  { label: 'Activo', value: 'ACTIVO' },
  { label: 'Inactivo', value: 'INACTIVO' },
] as const;

/** Schema base para todos los equipos */
export const equipoCreateBaseSchema = z.object({
  /** Código de inventario del equipo (ej. AZC-CHILLA-001) */
  codigo: z
    .string()
    .min(3, 'El código es obligatorio (mínimo 3 caracteres)')
    .max(50, 'Código demasiado largo'),

  /** Valor interno de ubicación */
  ubicacion: z.string().min(1, 'Selecciona una ubicación'),

  /** Detalle de ubicación (texto libre, opcional) */
  detalle_ubicacion: z.string().max(200).nullable().optional(),

  /** Estado operativo del equipo */
  estatus: z.enum(['ACTIVO', 'INACTIVO']),

  /** Campos técnicos específicos del tipo de equipo */
  equipment_detail: z.record(z.string(), z.unknown()),
});

export type EquipoCreateFormValues = z.infer<typeof equipoCreateBaseSchema>;

/** Schema para editar los datos técnicos de un equipo */
export const equipoDetailEditSchema = z.object({
  detalle_ubicacion: z.string().max(200).nullable().optional(),
  estatus: z.enum(['ACTIVO', 'INACTIVO']),
  equipment_detail: z.record(z.string(), z.unknown()),
});

export type EquipoDetailEditFormValues = z.infer<typeof equipoDetailEditSchema>;
