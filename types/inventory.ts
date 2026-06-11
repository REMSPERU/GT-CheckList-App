/**
 * Tipos para el flujo de Inventario.
 *
 * La fuente de verdad de los datos técnicos es el campo `equipment_detail` (JSONB)
 * en la tabla `equipos`. Los campos varían según el tipo de equipamento.
 */

import type { BaseEquipment } from './api';

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

export type FieldType = 'text' | 'number' | 'select' | 'boolean';

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
  /** Opciones para campos tipo "select" */
  options?: { label: string; value: string }[];
  /** Valor por defecto */
  defaultValue?: string | number | boolean;
}

/**
 * Mapeo de abreviatura de equipamento → campos técnicos a mostrar/editar.
 * Las abreviaturas coinciden con el campo `abreviatura` de la tabla `equipamentos`.
 *
 * Basado en los 12 tipos del ayuda.md.
 */
export const EQUIPMENT_TECHNICAL_FIELDS: Record<
  string,
  TechnicalFieldConfig[]
> = {
  // Patrón A: Grilla Tabular
  // 2.1 / 2.2 — Chiller Aire / Chiller Agua
  CHAI: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    {
      key: 'capacidad_enfriamiento',
      label: 'Capacidad',
      type: 'number',
      suffix: 'TR',
    },
    {
      key: 'tipo_refrigerante',
      label: 'Refrigerante',
      type: 'select',
      options: [
        { label: 'R134A', value: 'R134A' },
        { label: 'R410A', value: 'R410A' },
        { label: 'R22', value: 'R22' },
        { label: 'R32', value: 'R32' },
        { label: 'R407C', value: 'R407C' },
      ],
    },
    { key: 'voltaje', label: 'Voltaje', type: 'number', suffix: 'V' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
    {
      key: 'tipo_compresor',
      label: 'Tipo Compresor',
      type: 'select',
      options: [
        { label: 'Tornillo', value: 'Tornillo' },
        { label: 'Centrífugo', value: 'Centrífugo' },
        { label: 'Scroll', value: 'Scroll' },
        { label: 'Pistón', value: 'Pistón' },
      ],
    },
    {
      key: 'cantidad_compresor',
      label: 'Cant. Compresores',
      type: 'number',
    },
    {
      key: 'tipo_chiller',
      label: 'Tipo Chiller',
      type: 'select',
      options: [
        { label: 'Aire', value: 'Aire' },
        { label: 'Agua', value: 'Agua' },
      ],
    },
  ],

  // 2.1 / 2.2 — Chiller Agua (mismos campos, reutilizar CHAI)
  CHAG: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    {
      key: 'capacidad_enfriamiento',
      label: 'Capacidad',
      type: 'number',
      suffix: 'TR',
    },
    {
      key: 'tipo_refrigerante',
      label: 'Refrigerante',
      type: 'select',
      options: [
        { label: 'R134A', value: 'R134A' },
        { label: 'R410A', value: 'R410A' },
        { label: 'R22', value: 'R22' },
        { label: 'R32', value: 'R32' },
        { label: 'R407C', value: 'R407C' },
      ],
    },
    { key: 'voltaje', label: 'Voltaje', type: 'number', suffix: 'V' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
    {
      key: 'tipo_compresor',
      label: 'Tipo Compresor',
      type: 'select',
      options: [
        { label: 'Tornillo', value: 'Tornillo' },
        { label: 'Centrífugo', value: 'Centrífugo' },
        { label: 'Scroll', value: 'Scroll' },
        { label: 'Pistón', value: 'Pistón' },
      ],
    },
    { key: 'cantidad_compresor', label: 'Cant. Compresores', type: 'number' },
    {
      key: 'tipo_chiller',
      label: 'Tipo Chiller',
      type: 'select',
      options: [
        { label: 'Aire', value: 'Aire' },
        { label: 'Agua', value: 'Agua' },
      ],
    },
  ],

  // 2.3 / 2.4 — Torres de Enfriamiento (Patrón B)
  TOE: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    { key: 'ano_operacion', label: 'Año de Inicio', type: 'number' },
    {
      key: 'cap_motor',
      label: 'Capacidad Motor',
      type: 'number',
      suffix: 'HP',
    },
    {
      key: 'tipo_torre',
      label: 'Tipo Torre',
      type: 'select',
      options: [
        { label: 'Data Center', value: 'Data Center' },
        { label: 'Chiller', value: 'Chiller' },
      ],
    },
    {
      key: 'tiene_vdf',
      label: 'Tiene Variador (VDF)',
      type: 'boolean',
      defaultValue: false,
    },
    { key: 'marca_vdf', label: 'Marca VDF', type: 'text' },
    { key: 'modelo_vdf', label: 'Modelo VDF', type: 'text' },
    { key: 'voltaje_vdf', label: 'Voltaje VDF', type: 'number', suffix: 'V' },
    { key: 'cap_vdf', label: 'Capacidad VDF', type: 'number', suffix: 'kW' },
  ],

  // 2.5 — Ablandador de Agua (Patrón B)
  ABL: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    { key: 'capacidad', label: 'Capacidad', type: 'number', suffix: 'm³' },
    {
      key: 'cap_tanque_salmuera',
      label: 'Tanque Salmuera',
      type: 'number',
      suffix: 'L',
    },
    { key: 'ano_operacion', label: 'Año', type: 'number' },
  ],

  // 2.6-2.9 — Bombas (Patrón C)
  BBA: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    {
      key: 'tipo_bomba',
      label: 'Tipo de Bomba',
      type: 'select',
      options: [
        { label: 'Primaria', value: 'Primaria' },
        { label: 'Secundaria', value: 'Secundaria' },
        { label: 'Condensado', value: 'Condensado' },
        { label: 'Data Center', value: 'Data Center' },
      ],
    },
    {
      key: 'tiene_vdf',
      label: 'Tiene Variador (VDF)',
      type: 'boolean',
      defaultValue: false,
    },
    { key: 'marca_vdf', label: 'Marca VDF', type: 'text' },
    { key: 'modelo_vdf', label: 'Modelo VDF', type: 'text' },
    { key: 'cap_vdf', label: 'Capacidad VDF', type: 'number', suffix: 'kW' },
  ],

  // 2.10 — Splits (Patrón A)
  SPLIT: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    {
      key: 'capacidad_enfriamiento',
      label: 'Capacidad',
      type: 'number',
      suffix: 'BTU',
    },
    {
      key: 'tipo_refrigerante',
      label: 'Refrigerante',
      type: 'select',
      options: [
        { label: 'R134A', value: 'R134A' },
        { label: 'R410A', value: 'R410A' },
        { label: 'R22', value: 'R22' },
        { label: 'R32', value: 'R32' },
      ],
    },
    { key: 'voltaje', label: 'Voltaje', type: 'number', suffix: 'V' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // 2.11 — Fan Coils (Patrón A)
  FCU: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    {
      key: 'capacidad_enfriamiento',
      label: 'Capacidad',
      type: 'number',
      suffix: 'BTU',
    },
    {
      key: 'tipo_refrigerante',
      label: 'Refrigerante',
      type: 'select',
      options: [
        { label: 'R134A', value: 'R134A' },
        { label: 'R410A', value: 'R410A' },
        { label: 'R22', value: 'R22' },
        { label: 'R32', value: 'R32' },
      ],
    },
    { key: 'voltaje', label: 'Voltaje', type: 'number', suffix: 'V' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // 2.12 — UMAs (Patrón A)
  UMA: [
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    {
      key: 'capacidad_enfriamiento',
      label: 'Capacidad',
      type: 'number',
      suffix: 'TR',
    },
    {
      key: 'tipo_refrigerante',
      label: 'Refrigerante',
      type: 'select',
      options: [
        { label: 'R134A', value: 'R134A' },
        { label: 'R410A', value: 'R410A' },
        { label: 'R22', value: 'R22' },
      ],
    },
    { key: 'voltaje', label: 'Voltaje', type: 'number', suffix: 'V' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Tablero Eléctrico
  TBELEC: [
    {
      key: 'tipo_tablero',
      label: 'Tipo Tablero',
      type: 'select',
      options: [
        { label: 'General', value: 'General' },
        { label: 'Distribución', value: 'Distribución' },
        { label: 'Sub-distribución', value: 'Sub-distribución' },
        { label: 'Sección', value: 'Sección' },
      ],
    },
    { key: 'rotulo', label: 'Rótulo', type: 'text' },
    {
      key: 'fases',
      label: 'Fases',
      type: 'select',
      options: [
        { label: 'Monofásico', value: 'Monofásico' },
        { label: 'Trifásico', value: 'Trifásico' },
      ],
    },
    { key: 'voltaje', label: 'Voltaje', type: 'number', suffix: 'V' },
  ],

  // Luces de Emergencia
  LUZ: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    {
      key: 'capacidad_bateria',
      label: 'Capacidad Batería',
      type: 'number',
      suffix: 'Ah',
    },
    { key: 'ano_instalacion', label: 'Año Instalación', type: 'number' },
  ],

  // Pozo a Tierra
  PAT: [
    {
      key: 'resistencia_ohm',
      label: 'Resistencia',
      type: 'number',
      suffix: 'Ω',
    },
    { key: 'ano_instalacion', label: 'Año Instalación', type: 'number' },
    { key: 'profundidad_m', label: 'Profundidad', type: 'number', suffix: 'm' },
  ],
};

/**
 * Obtiene la configuración de campos técnicos para una abreviatura de equipamento.
 * Si no hay configuración específica, retorna campos genéricos.
 */
export function getTechnicalFields(
  abreviatura: string | null | undefined,
): TechnicalFieldConfig[] {
  if (!abreviatura) return getGenericFields();
  return EQUIPMENT_TECHNICAL_FIELDS[abreviatura] ?? getGenericFields();
}

function getGenericFields(): TechnicalFieldConfig[] {
  return [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ];
}

/**
 * Traduce el valor de `ubicacion` al texto que se muestra en la UI.
 * Reglas del ayuda.md:
 * - "AZOTEA" / "SEMISOTANO" → texto tal cual
 * - Número positivo (ej. "3") → "Piso 3"
 * - Empieza con "-S" (ej. "-S2") → "Sótano 2"
 */
export function translateUbicacion(
  ubicacion: string | null | undefined,
): string {
  if (!ubicacion) return 'Sin ubicación';

  const upper = ubicacion.trim().toUpperCase();
  if (upper === 'AZOTEA') return 'Azotea';
  if (upper === 'SEMISOTANO') return 'Semisótano';

  if (upper.startsWith('-S')) {
    const num = upper.slice(2);
    return `Sótano ${num}`;
  }

  const numVal = parseInt(ubicacion, 10);
  if (!isNaN(numVal) && numVal > 0) {
    return `Piso ${numVal}`;
  }

  return ubicacion;
}
