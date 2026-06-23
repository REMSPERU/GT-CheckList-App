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

const YES_NO_OPTIONS = [
  { label: 'Sí', value: 'SI' },
  { label: 'No', value: 'NO' },
];

const COMMON_BRAND_MODEL_YEAR_FIELDS: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];

const COMMON_VDF_FIELDS: TechnicalFieldConfig[] = [
  { key: 'marca_vdf', label: 'Marca VDF', type: 'text', section: 'VDF' },
  { key: 'modelo_vdf', label: 'Modelo VDF', type: 'text', section: 'VDF' },
  { key: 'voltaje_vdf', label: 'Voltaje VDF', type: 'number', suffix: 'V', section: 'VDF' },
  { key: 'capacidad_vdf', label: 'Capacidad VDF', type: 'text', section: 'VDF' },
  { key: 'ano_operacion_vdf', label: 'Año VDF', type: 'number', section: 'VDF' },
];

const CHILLER_PUMP_FIELDS: TechnicalFieldConfig[] = [
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

const ACCESS_DEVICE_FIELDS: TechnicalFieldConfig[] = [
  { key: 'cantidad', label: 'Cantidad', type: 'number' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];

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
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    {
      key: 'tipo',
      label: 'Tipo Torre',
      type: 'select',
      options: [
        { label: 'Data Center', value: 'datacenter' },
        { label: 'Chiller', value: 'chiller' },
      ],
    },
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    { key: 'ano_operacion', label: 'Año de Inicio', type: 'number' },
    {
      key: 'cap_motor',
      label: 'Capacidad Motor',
      type: 'number',
      suffixFrom: 'unidad_motor',
    },
    {
      key: 'cantidad_total',
      label: 'Cantidad Total',
      type: 'number',
    },
    {
      key: 'vdf.tiene_vdf',
      label: 'Tiene Variador (VDF)',
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
      key: 'vdf.voltaje',
      label: 'Voltaje VDF',
      type: 'number',
      suffix: 'V',
      section: 'VDF',
      visibleWhen: { key: 'vdf.tiene_vdf', equals: true },
    },
    {
      key: 'vdf.capacidad',
      label: 'Capacidad VDF',
      type: 'number',
      suffixFrom: 'vdf.unidad',
      section: 'VDF',
      visibleWhen: { key: 'vdf.tiene_vdf', equals: true },
    },
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

  BACHC: CHILLER_PUMP_FIELDS,
  BACHP: CHILLER_PUMP_FIELDS,
  BACHS: CHILLER_PUMP_FIELDS,
  BADC: CHILLER_PUMP_FIELDS,
  BADP: CHILLER_PUMP_FIELDS,

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
        { label: 'AGUA', value: 'AGUA' },
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
    { key: 'grupo', label: 'Grupo / Malla', type: 'text' },
    { key: 'numero', label: 'Número', type: 'text' },
    { key: 'DENOMINACION', label: 'Denominación', type: 'text' },
  ],

  // Equipos Autocontenidos
  AUTOC: [
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    { key: 'capacidad_enfriamiento', label: 'Capacidad', type: 'text' },
    { key: 'tipo_refrigerante', label: 'Refrigerante', type: 'text' },
    { key: 'voltaje', label: 'Voltaje', type: 'text' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Ventilación Forzada
  VFOR: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'marca_motor', label: 'Marca Motor', type: 'text', section: 'Motor' },
    { key: 'modelo_motor', label: 'Modelo Motor', type: 'text', section: 'Motor' },
    { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text', section: 'Motor' },
    { key: 'anio_operacion_motor', label: 'Año Motor', type: 'number', section: 'Motor' },
    { key: 'capacidad_flujo', label: 'Capacidad Flujo', type: 'text' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes / Variador (VDF)',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [{ label: 'VDF', value: 'vdf' }],
          defaultValue: 'vdf',
        },
        { key: 'marca', label: 'Marca VDF', type: 'text' },
        { key: 'modelo', label: 'Modelo VDF', type: 'text' },
        { key: 'capacidad', label: 'Capacidad VDF', type: 'text' },
        { key: 'anio_operacion', label: 'Año VDF', type: 'number' },
      ],
    },
  ],

  // Sistemas VRV / VRF
  VRF: [
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text', multiline: true },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Condensador', value: 'condensador' },
            { label: 'Evaporador / Interior', value: 'evaporador_interior' },
            { label: 'Placa', value: 'placa' },
            { label: 'Torre VRF', value: 'torre' },
          ],
        },
        { key: 'unidad', label: 'Unidad / N°', type: 'number' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
        { key: 'voltaje', label: 'Voltaje', type: 'text' },
        { key: 'anio_operacion', label: 'Año', type: 'number' },
      ],
    },
  ],

  // Grupos Electrógenos
  GE: [
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'marca', label: 'Marca', type: 'text', required: true },
    { key: 'modelo', label: 'Modelo', type: 'text', required: true },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'voltaje', label: 'Voltaje', type: 'text' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'text' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Tanque de Combustible', value: 'tanque_combustible' },
          ],
          defaultValue: 'tanque_combustible',
        },
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'tipo_tanque', label: 'Tipo Tanque', type: 'text' },
      ],
    },
  ],

  // Subestaciones Eléctricas
  SUBE: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'potencia_contratada', label: 'Potencia Contratada', type: 'text' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Celda', value: 'celda' },
            { label: 'Transformador Seco', value: 'SECO' },
            { label: 'Transformador Aceite', value: 'ACEITE' },
            { label: 'UPS / Respaldo', value: 'ups' },
          ],
        },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'voltaje_salida', label: 'Voltaje Salida', type: 'text' },
        { key: 'anio_operacion', label: 'Año', type: 'number' },
      ],
    },
  ],

  // Tableros de distribución / autosoportados
  TBDIST: [
    { key: 'numero_tablero', label: 'Número de Tablero', type: 'number' },
    { key: 'rotulo', label: 'Rótulo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación', type: 'text' },
  ],
  TBAUTO: [
    { key: 'numero_tablero', label: 'Número de Tablero', type: 'number' },
    { key: 'rotulo', label: 'Rótulo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación', type: 'text' },
  ],

  // Busbars
  BUSBAR: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
    {
      key: 'subcomponentes',
      label: 'Tramos de Distribución',
      type: 'collection',
      fields: [
        { key: 'tipo', label: 'Tipo', type: 'text', defaultValue: 'tramo' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'ubicacion_otro', label: 'Otra Ubicación', type: 'text' },
      ],
    },
  ],

  // Tablero de Transferencia Automática
  TTA: [
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'tipo_transferencia', label: 'Tipo Transferencia', type: 'text' },
    { key: 'marca_modulo', label: 'Marca Módulo', type: 'text' },
    { key: 'modelo_modulo', label: 'Modelo Módulo', type: 'text' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text', multiline: true },
    {
      key: 'subcomponentes',
      label: 'Banco de Condensadores',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Banco de Condensador', value: 'banco_condensador' },
          ],
          defaultValue: 'banco_condensador',
        },
        { key: 'unidad', label: 'Unidad', type: 'number' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
      ],
    },
  ],

  // Transformadores de Aislamiento
  TRAIS: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes',
      type: 'collection',
      fields: [
        { key: 'tipo', label: 'Tipo', type: 'text' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'autonomia', label: 'Autonomía', type: 'text' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
      ],
    },
  ],

  // Cisternas de Agua Potable / PTAG
  CISTPTAG: [
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'comparte_cisterna', label: 'Comparte Cisterna', type: 'select', options: YES_NO_OPTIONS },
    { key: 'observacion', label: 'Observación', type: 'text', multiline: true },
  ],

  // Cisternas BCI
  CISTBCI: [
    { key: 'numero_unidad', label: 'Unidad', type: 'number' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'compartida', label: 'Compartida', type: 'text' },
    { key: 'sistem_comparte', label: 'Sistema que Comparte', type: 'text' },
    { key: 'plato_antivortice', label: 'Plato Antivórtice', type: 'select', options: YES_NO_OPTIONS },
  ],

  // Tanques Elevados
  TELEV: [
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'comparte_cisterna', label: 'Comparte Cisterna', type: 'text' },
    { key: 'detalle_compartir', label: 'Detalle Compartir', type: 'text', multiline: true },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes / Electrobombas',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Electrobomba', value: 'electrobomba' },
          ],
          defaultValue: 'electrobomba',
        },
        { key: 'tipo_bomba', label: 'Tipo Bomba', type: 'text' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text' },
        { key: 'capacidad_bomba', label: 'Capacidad Bomba', type: 'text' },
        { key: 'anio_operacion', label: 'Año', type: 'number' },
      ],
    },
  ],

  // Red Húmeda
  RH: [
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Grupo Red Húmeda', value: 'grupo_red_humeda' },
          ],
          defaultValue: 'grupo_red_humeda',
        },
        { key: 'componente', label: 'Componente', type: 'text' },
        { key: 'piso', label: 'Piso', type: 'text' },
        { key: 'cantidad', label: 'Cantidad', type: 'number' },
        {
          key: 'items',
          label: 'Items Detallados',
          type: 'collection',
          fields: [
            { key: 'n_orden', label: 'N° Orden', type: 'number' },
            { key: 'piso', label: 'Piso', type: 'text' },
            { key: 'manguera', label: 'Manguera', type: 'select', options: YES_NO_OPTIONS },
            { key: 'valvula_angular', label: 'Válvula Angular', type: 'select', options: YES_NO_OPTIONS },
          ],
        },
      ],
    },
  ],

  // Bombas Dosificadoras
  BDOS: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Bombas Eléctricas
  BELEC: [
    { key: 'tipo_bomba', label: 'Tipo Bomba', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text' },
    { key: 'capacidad_bomba_gpm', label: 'Capacidad Bomba', type: 'number', suffix: 'GPM' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Tanques de Filtrado
  TFIL: [
    { key: 'indice', label: 'Índice', type: 'number' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'filtro_racor', label: 'Filtro Racor', type: 'boolean' },
    { key: 'ano_operacion_filtro', label: 'Año Filtro Racor', type: 'number', visibleWhen: { key: 'filtro_racor', equals: true } },
  ],

  // Tanques Hidroneumáticos
  THID: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad_l', label: 'Capacidad', type: 'number', suffix: 'L' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Válvulas Reguladoras de Presión
  VREG: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Sistema de Alarma y Detección de Incendios
  SIN: [
    { key: 'tipo_sistema', label: 'Tipo Sistema', type: 'text' },
    { key: 'estado_sistema', label: 'Estado Sistema', type: 'boolean' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes / Dispositivos',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Panel Central', value: 'panel_central' },
            { label: 'Sensores de Humo', value: 'sensores_humo' },
            { label: 'Sensores de Temperatura', value: 'sensores_temperatura' },
            { label: 'Estaciones Manuales', value: 'estaciones_manuales' },
            { label: 'Fuentes de Poder NAC', value: 'fuentes_nac' },
            { label: 'Luces Estroboscópicas', value: 'luces_estroboscopicas' },
            { label: 'Módulos', value: 'modulos' },
            { label: 'Minimódulos', value: 'minimodulos' },
            { label: 'Jacks y Teléfonos', value: 'jacks_telefonos' },
            { label: 'Amplificadores', value: 'amplificadores' },
          ],
        },
        { key: 'cantidad', label: 'Cantidad', type: 'number' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
        { key: 'con_parlantes', label: 'Con Parlantes', type: 'boolean', visibleWhen: { key: 'tipo', equals: 'luces_estroboscopicas' } },
      ],
    },
  ],

  // CCTV
  CCTV: [
    { key: 'sistema_operacion', label: 'Sistema Operación', type: 'text' },
    { key: 'software_nombre', label: 'Software', type: 'text' },
    { key: 'software_marca', label: 'Marca Software', type: 'text' },
    { key: 'software_version', label: 'Versión Software', type: 'text' },
    { key: 'tiene_servidor', label: 'Tiene Servidor', type: 'boolean' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes / Dispositivos',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Cámara', value: 'camara' },
            { label: 'Grabador', value: 'grabador' },
            { label: 'Pantallas / Monitores', value: 'pantalla' },
            { label: 'Switches de Red', value: 'switch' },
            { label: 'Almacenamiento', value: 'almacenamiento' },
            { label: 'Servidor', value: 'servidor' },
          ],
        },
        { key: 'cantidad', label: 'Cantidad', type: 'number' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
        { key: 'tam_pulgadas', label: 'Tamaño (pulgadas)', type: 'number', visibleWhen: { key: 'tipo', equals: 'pantalla' } },
        { key: 'capacidad', label: 'Capacidad', type: 'text', visibleWhen: { key: 'tipo', equals: 'almacenamiento' } },
      ],
    },
  ],

  // Puertas Cortafuego
  PCF: [
    { key: 'indice', label: 'Índice', type: 'number' },
    { key: 'ubicacion_detalle', label: 'Ubicación Detalle', type: 'text' },
    { key: 'puerta_marca', label: 'Marca Puerta', type: 'text' },
    { key: 'puerta_modelo', label: 'Modelo Puerta', type: 'text' },
    { key: 'cierre_tipo', label: 'Tipo Cierre', type: 'text' },
    { key: 'cierre_marca', label: 'Marca Cierre', type: 'text' },
    { key: 'cierre_modelo', label: 'Modelo Cierre', type: 'text' },
    { key: 'barra_antipanico', label: 'Barra Antipánico', type: 'select', options: YES_NO_OPTIONS },
    { key: 'barra_marca', label: 'Marca Barra', type: 'text' },
    { key: 'barra_modelo', label: 'Modelo Barra', type: 'text' },
    { key: 'cantidad', label: 'Cantidad', type: 'number' },
  ],

  // Bombas Jockey
  BJOCK: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'motor_potencia', label: 'Potencia Motor', type: 'text' },
    { key: 'bomba_capacidad', label: 'Capacidad Bomba', type: 'text' },
    { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'marca_tablero', label: 'Marca Tablero', type: 'text', section: 'Tablero de Control' },
    { key: 'modelo_tablero', label: 'Modelo Tablero', type: 'text', section: 'Tablero de Control' },
    { key: 'ano_tablero', label: 'Año Tablero', type: 'number', section: 'Tablero de Control' },
  ],

  // Bombas de Incendio Principales
  BINC: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'motor_marca', label: 'Marca Motor', type: 'text', section: 'Motor' },
    { key: 'motor_modelo', label: 'Modelo Motor', type: 'text', section: 'Motor' },
    { key: 'motor_potencia', label: 'Potencia Motor', type: 'text', section: 'Motor' },
    { key: 'motor_ano', label: 'Año Motor', type: 'number', section: 'Motor' },
    { key: 'bomba_capacidad', label: 'Capacidad Bomba', type: 'text', section: 'Bomba' },
    { key: 'bomba_ano', label: 'Año Bomba', type: 'number', section: 'Bomba' },
    { key: 'tablero_marca', label: 'Marca Tablero', type: 'text', section: 'Tablero' },
    { key: 'tablero_modelo', label: 'Modelo Tablero', type: 'text', section: 'Tablero' },
    { key: 'vacuometro', label: 'Vacuómetro', type: 'text' },
    { key: 'tanque_combustible', label: 'Tanque Combustible', type: 'text' },
  ],

  // Seguridad Peatonal
  SEGP: [
    { key: 'software_nombre', label: 'Software', type: 'text' },
    { key: 'software_marca', label: 'Marca Software', type: 'text' },
    { key: 'software_version', label: 'Versión Software', type: 'text' },
    { key: 'tiene_servidor', label: 'Tiene Servidor', type: 'boolean' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes / Dispositivos',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Torniquetes', value: 'torniquete' },
            { label: 'Molinete Discapacitados', value: 'molinete_discapacitados' },
            { label: 'Lectoras de Acceso', value: 'lectoras_acceso' },
            { label: 'Pulsadores de Acceso', value: 'pulsadores_acceso' },
            { label: 'Cerraduras Electromagnéticas', value: 'cerraduras_electromagneticas' },
            { label: 'Sensores de Movimiento', value: 'sensores_movimiento' },
            { key: 'contactos_magneticos', label: 'Contactos Magnéticos', type: 'collection', fields: ACCESS_DEVICE_FIELDS },
            { label: 'Contactos Magnéticos', value: 'contactos_magneticos' },
            { label: 'Sensores de Aniego', value: 'sensores_aniego' },
            { label: 'Controladores de Acceso', value: 'controladores_acceso' },
            { label: 'Servidor', value: 'servidor' },
          ],
        },
        { key: 'cantidad', label: 'Cantidad', type: 'number' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
      ],
    },
  ],

  // Seguridad Vehicular
  SEGV: [
    { key: 'software_nombre', label: 'Software', type: 'text' },
    { key: 'software_marca', label: 'Marca Software', type: 'text' },
    { key: 'software_version', label: 'Versión Software', type: 'text' },
    { key: 'tiene_servidor', label: 'Tiene Servidor', type: 'boolean' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes / Dispositivos',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Tranqueras', value: 'tranquera' },
            { label: 'Tecnologías de Acceso', value: 'tecnologias_acceso' },
            { label: 'Dispositivos Tecnología', value: 'dispositivos_tecnologia' },
            { label: 'Controladores de Acceso', value: 'controladores_acceso' },
            { label: 'Servidor', value: 'servidor' },
          ],
        },
        { key: 'cantidad', label: 'Cantidad', type: 'number' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
      ],
    },
  ],

  // Ascensores
  ASC: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'tipo_llamada', label: 'Tipo Llamada', type: 'text' },
    { key: 'detalle_llamada', label: 'Detalle Llamada', type: 'text' },
    { key: 'llamada_anticipada', label: 'Llamada Anticipada', type: 'boolean' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Mamparas
  MAMP: [
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo_freno', label: 'Modelo Freno', type: 'text' },
    { key: 'tipo_vidrio', label: 'Tipo Vidrio', type: 'text' },
    { key: 'tipo_vidrio_otros', label: 'Otro Tipo Vidrio', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación', type: 'text' },
  ],

  // Data Center
  DC: [
    { key: 'unidad', label: 'Unidad', type: 'number' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Placa', value: 'placa' },
            { label: 'Bomba', value: 'bomba' },
          ],
        },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
      ],
    },
  ],

  // Bombas de Desagüe y Sumidero
  BDS: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text' },
    { key: 'capacidad_bomba', label: 'Capacidad Bomba', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  ],

  // Plataformas para Discapacitados
  PDISC: [
    { key: 'unidad', label: 'Unidad', type: 'number' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'number', suffix: 'Kg' },
    { key: 'tiempo_operacion', label: 'Tiempo Operación', type: 'text' },
    { key: 'cantidad', label: 'Cantidad', type: 'number' },
  ],

  // Centrales Telefónicas
  CTELEF: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    {
      key: 'subcomponentes',
      label: 'Subcomponentes',
      type: 'collection',
      fields: [
        {
          key: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: [
            { label: 'Teléfono', value: 'telefono' },
            { label: 'Switch', value: 'switch' },
          ],
        },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'modelo', label: 'Modelo', type: 'text' },
        { key: 'cantidad', label: 'Cantidad', type: 'number' },
        { key: 'ubicacion', label: 'Ubicación', type: 'text' },
        { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
      ],
    },
  ],
};

const EQUIPMENT_TECHNICAL_FIELD_ALIASES: Record<string, string> = {
  // Chillers
  CHILLER: 'CHAI',
  CHILLER_AIRE: 'CHAI',
  CHILLER_AGUA: 'CHAG',
  // Fan Coils
  FANCOIL: 'FCU',
  FCOIL: 'FCU',
  FACO: 'FCU',
  // Torres de Enfriamiento
  TORRE_ENFRIAMIENTO: 'TOE',
  TORRE: 'TOE',
  TOEDC: 'TOE',
  TOECH: 'TOE',
  TE: 'TOE',
  TE_DC: 'TOE',
  TOE_DC: 'TOE',
  TE_CH: 'TOE',
  TOE_CH: 'TOE',
  TORRES_DE_ENFRIAMIENTO: 'TOE',
  // Ablandadores
  AGU: 'ABL',
  // Splits
  SP: 'SPLIT',
  // Ventilación
  VENT: 'VFOR',
  VF: 'VFOR',
  VENTILACION_FORZADA: 'VFOR',
  // Autocontenidos
  AUTO: 'AUTOC',
  AUTOCONTENIDO: 'AUTOC',
  // VRV
  VRV: 'VRF',
  VRF_SISTEMA: 'VRF',
  // Tableros
  TABLERO_DISTRIBUCION: 'TBDIST',
  TBAUT: 'TBAUTO',
  TABLERO_AUTOSOPORTADO: 'TBAUTO',
  TTA: 'TTA',
  TABLERO_TRANSFERENCIA: 'TTA',
  // Grupos
  GELEC: 'GE',
  GRUPO_ELECTROGENO: 'GE',
  GEE: 'GE',
  // Subestaciones
  SUBEST: 'SUBE',
  SUBESTACION: 'SUBE',
  SUBESTACION_ELECTRICA: 'SUBE',
  // Transformadores
  TRANSFORMADOR_DE_AISLAMIENTO: 'TRAIS',
  TRANSFORMADOR_AISLAMIENTO: 'TRAIS',
  // Busbars
  BBAR: 'BUSBAR',
  // Cisternas
  CIS: 'CISTPTAG',
  CISTERNA_PTAG: 'CISTPTAG',
  CISTERNA_AGUA_POTABLE: 'CISTPTAG',
  CISPTAG: 'CISTPTAG',
  CISTERNA_BCI: 'CISTBCI',
  CISBCI: 'CISTBCI',
  // Tanques
  TANQUE_ELEVADO: 'TELEV',
  TANQUELE: 'TELEV',
  TFILT: 'TFIL',
  TANQUE_FILTRADO: 'TFIL',
  THIDRO: 'THID',
  TANQUE_HIDRONEUMATICO: 'THID',
  // Red Húmeda
  RED_HUMEDA: 'RH',
  RHUM: 'RH',
  // Bombas
  BOMBA_DOSIFICADORA: 'BDOS',
  BOMBA_ELECTRICA: 'BELEC',
  BOMBA_ELECTRICA_PTAG: 'BELEC',
  BDESG: 'BDS',
  BOMBA_DESAGUE_SUMIDERO: 'BDS',
  // Válvulas
  REGUL: 'VREG',
  REGULADORA: 'VREG',
  VALVULA_REGULADORA: 'VREG',
  // Incendio / Alarmas
  SINC: 'SIN',
  SISTEMA_INCENDIO: 'SIN',
  PUERTA_CORTAFUEGO: 'PCF',
  PCORT: 'PCF',
  // Seguridad
  SEGPEAT: 'SEGP',
  SEGURIDAD_PEATONAL: 'SEGP',
  SEGVEH: 'SEGV',
  SEGURIDAD_VEHICULAR: 'SEGV',
  // Ascensores
  ASCENSOR: 'ASC',
  // Mamparas
  MAMPARA: 'MAMP',
  MAMPARAS: 'MAMP',
  // Servidores / Data Center
  DATACENTER: 'DC',
  DATA_CENTER: 'DC',
  SRVDC: 'DC',
  // Plataformas
  PLATDISC: 'PDISC',
  PLATAFORMA_DISCAPACITADOS: 'PDISC',
  // Centrales
  CENTTEL: 'CTELEF',
  CENTRAL_TELEFONICA: 'CTELEF',
  SIS_CCTV: 'CCTV',
  BOMBA_JOCKEY: 'BJOCK',
  BOMBA_INCENDIO: 'BINC',
};

/**
 * Obtiene la configuración de campos técnicos para una abreviatura de equipamento.
 * Si no hay configuración específica, retorna campos genéricos.
 */
export function getTechnicalFields(
  abreviatura: string | null | undefined,
): TechnicalFieldConfig[] {
  if (!abreviatura) return getGenericFields();
  const normalized = abreviatura
    .trim()
    .toUpperCase()
    .replace(/[\s/-]+/g, '_');
  const key = EQUIPMENT_TECHNICAL_FIELD_ALIASES[normalized] ?? normalized;
  return EQUIPMENT_TECHNICAL_FIELDS[key] ?? getGenericFields();
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
