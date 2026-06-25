import type { BaseEquipment } from '../api';

// ─── Equipos con JOIN de nombre/sistema ──────────────────────────────────────

export interface InventoryEquipo extends Omit<
  BaseEquipment,
  'detalle_ubicacion' | 'equipment_detail' | 'id_equipamento'
> {
  id_equipamento: string;
  detalle_ubicacion: string | null;
  equipment_detail?: Record<string, unknown> | null;
  /** Nombre del equipamento (JOIN con equipamentos) */
  equipamento_nombre?: string | null;
  /** Abreviatura del equipamento */
  equipamento_abreviatura?: string | null;
  /** Nombre del sistema al que pertenece el equipamento */
  sistema_nombre?: string | null;
  /** Frecuencia del equipamento, usada para lanzar checklist */
  equipamento_frecuencia?: string | null;
  /** Nombre del inmueble, cuando está disponible en JOIN */
  property_name?: string | null;
}

// ─── Sistema (agrupador de equipamentos) ─────────────────────────────────────

export interface InventorySistema {
  id: string;
  nombre: string;
  activo: boolean;
  /** Número de tipos de equipamento asociados */
  equipamentos_count: number;
  /** Número de equipos activos en este sistema */
  equipos_count: number;
}

// ─── Equipamento con conteo de equipos ───────────────────────────────────────

export interface InventoryEquipamento {
  id: string;
  nombre: string;
  abreviatura: string;
  frecuencia?: string | null;
  id_sistema?: string | null;
  /** Número de equipos activos de este tipo */
  equipos_count: number;
}

// ─── Configuración de campos técnicos por tipo ───────────────────────────────

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'collection';

export interface TechnicalFieldConfig {
  /** Clave en el objeto equipment_detail */
  key: string;
  /** Etiqueta para mostrar en la UI */
  label: string;
  type: FieldType;
  /** Si el campo es requerido en el formulario */
  required?: boolean;
  /** Sufijo que se muestra junto al valor (ej. "TR", "V", "HP") */
  suffix?: string;
  /** Clave de otro campo que contiene la unidad/sufijo dinámico */
  suffixFrom?: string;
  /** Opciones para campos tipo "select" */
  options?: { label: string; value: string }[];
  /** Valor por defecto */
  defaultValue?: string | number | boolean;
  /** Agrupador visual para detalle técnico y formulario */
  section?: string;
  /** Renderiza el campo de texto con varias líneas */
  multiline?: boolean;
  /** Campos internos cuando el tipo es una colección de subcomponentes */
  fields?: TechnicalFieldConfig[];
  /** Campo booleano que habilita la visualización/edición del campo actual */
  visibleWhen?: {
    key: string;
    equals: unknown;
  };
}

export const YES_NO_OPTIONS = [
  { label: 'Sí', value: 'SI' },
  { label: 'No', value: 'NO' },
];

export const COMMON_BRAND_MODEL_YEAR_FIELDS: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];

export const COMMON_VDF_FIELDS: TechnicalFieldConfig[] = [
  { key: 'marca_vdf', label: 'Marca VDF', type: 'text', section: 'VDF' },
  { key: 'modelo_vdf', label: 'Modelo VDF', type: 'text', section: 'VDF' },
  {
    key: 'voltaje_vdf',
    label: 'Voltaje VDF',
    type: 'number',
    suffix: 'V',
    section: 'VDF',
  },
  {
    key: 'capacidad_vdf',
    label: 'Capacidad VDF',
    type: 'text',
    section: 'VDF',
  },
  {
    key: 'ano_operacion_vdf',
    label: 'Año VDF',
    type: 'number',
    section: 'VDF',
  },
];

export const CHILLER_PUMP_FIELDS: TechnicalFieldConfig[] = [
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'tipo', label: 'Tipo de Bomba', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  {
    key: 'vdf.tiene_vdf',
    label: 'Tiene VDF',
    type: 'boolean',
    defaultValue: false,
    section: 'VDF',
  },
  {
    key: 'vdf.marca',
    label: 'Marca VDF',
    type: 'text',
    section: 'VDF',
    visibleWhen: { key: 'vdf.tiene_vdf', equals: true },
  },
  {
    key: 'vdf.modelo',
    label: 'Modelo VDF',
    type: 'text',
    section: 'VDF',
    visibleWhen: { key: 'vdf.tiene_vdf', equals: true },
  },
  {
    key: 'vdf.capacidad',
    label: 'Capacidad VDF',
    type: 'number',
    section: 'VDF',
    suffixFrom: 'vdf.unidad',
    visibleWhen: { key: 'vdf.tiene_vdf', equals: true },
  },
];

export const ACCESS_DEVICE_FIELDS: TechnicalFieldConfig[] = [
  { key: 'cantidad', label: 'Cantidad', type: 'number' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];
