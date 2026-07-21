import type { TechnicalFieldConfig } from './common';

export const CHAI: TechnicalFieldConfig[] = [
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
];

export const CHAG: TechnicalFieldConfig[] = [
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
];

export const TOE: TechnicalFieldConfig[] = [
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
];

export const SPLIT: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  {
    key: 'capacidad_enfriamiento',
    label: 'Capacidad Enfriamiento',
    type: 'text',
  },
  { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
  {
    key: 'tipo_refrigerante',
    label: 'Refrigerante',
    type: 'text',
  },
  { key: 'voltaje', label: 'Voltaje', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'cantidad_total', label: 'Cantidad Total', type: 'number' },
  { key: 'marca_catalogo', label: 'Marca Catálogo', type: 'text' },
];

export const FCU: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  {
    key: 'capacidad_enfriamiento',
    label: 'Capacidad Enfriamiento',
    type: 'text',
  },
  { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
  {
    key: 'tipo_refrigerante',
    label: 'Refrigerante',
    type: 'text',
  },
  { key: 'voltaje', label: 'Voltaje', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'cantidad_total', label: 'Cantidad Total', type: 'number' },
];

export const UMA: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  {
    key: 'capacidad_enfriamiento',
    label: 'Capacidad Enfriamiento',
    type: 'text',
  },
  { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
  {
    key: 'tipo_refrigerante',
    label: 'Refrigerante',
    type: 'text',
  },
  { key: 'voltaje', label: 'Voltaje', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'cantidad_total', label: 'Cantidad Total', type: 'number' },
];

export const AUTOC: TechnicalFieldConfig[] = [
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'marca', label: 'Marca', type: 'text', required: true },
  { key: 'modelo', label: 'Modelo', type: 'text', required: true },
  { key: 'capacidad_enfriamiento', label: 'Capacidad Enfriamiento', type: 'text' },
  { key: 'tipo_refrigerante', label: 'Refrigerante', type: 'text' },
  { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
  { key: 'voltaje', label: 'Voltaje', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
];

export const VFOR: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'marca_motor', label: 'Marca Motor', type: 'text', section: 'Motor' },
  {
    key: 'modelo_motor',
    label: 'Modelo Motor',
    type: 'text',
    section: 'Motor',
  },
  {
    key: 'capacidad_motor',
    label: 'Capacidad Motor',
    type: 'text',
    section: 'Motor',
  },
  {
    key: 'anio_operacion_motor',
    label: 'Año Motor',
    type: 'number',
    section: 'Motor',
  },
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
];

export const VRF: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'unidad', label: 'Unidad', type: 'text' },
  { key: 'ubicacion', label: 'Ubicación General', type: 'text' },
  { key: 'voltaje', label: 'Voltaje', type: 'text' },
  { key: 'capacidad', label: 'Capacidad', type: 'text' },
  { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  {
    key: 'observaciones',
    label: 'Observaciones',
    type: 'text',
    multiline: true,
  },
  {
    key: 'subcomponentes',
    label: 'Subcomponentes (Evaporadores / Condensadores)',
    type: 'collection',
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' },
      { key: 'modelo', label: 'Modelo', type: 'text' },
      { key: 'unidad', label: 'Unidad', type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', type: 'text' },
      { key: 'capacidad', label: 'Capacidad', type: 'text' },
      { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
      { key: 'voltaje', label: 'Voltaje', type: 'text' },
      { key: 'anio_operacion', label: 'Año', type: 'number' },
    ],
  },
];
