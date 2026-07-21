import type { TechnicalFieldConfig } from './common';
import { YES_NO_OPTIONS, CHILLER_PUMP_FIELDS } from './common';

export const ABL: TechnicalFieldConfig[] = [
  {
    key: 'marca',
    label: 'Marca',
    type: 'text',
    required: true,
  },
  {
    key: 'modelo',
    label: 'Modelo',
    type: 'text',
    required: true,
  },
  {
    key: 'capacidad',
    label: 'Capacidad',
    type: 'number',
    suffix: 'm³',
  },
  { key: 'ano_operacion', label: 'Año', type: 'number', defaultValue: 2018 },
  {
    key: 'cap_tanque_salmuera',
    label: 'Tanque Salmuera',
    type: 'number',
    suffix: 'm³',
  },
];

export const BBA: TechnicalFieldConfig[] = [
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
];

export const BACHC = CHILLER_PUMP_FIELDS;
export const BACHP = CHILLER_PUMP_FIELDS;
export const BACHS = CHILLER_PUMP_FIELDS;
export const BADC = CHILLER_PUMP_FIELDS;
export const BADP = CHILLER_PUMP_FIELDS;

export const CISTPTAG: TechnicalFieldConfig[] = [
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'capacidad', label: 'Capacidad', type: 'text' },
  {
    key: 'comparte_cisterna',
    label: 'Comparte Cisterna',
    type: 'select',
    options: YES_NO_OPTIONS,
  },
  { key: 'observacion', label: 'Observación', type: 'text', multiline: true },
];

export const CISTBCI: TechnicalFieldConfig[] = [
  { key: 'numero_unidad', label: 'Unidad', type: 'number' },
  { key: 'capacidad', label: 'Capacidad', type: 'text' },
  { key: 'compartida', label: 'Compartida', type: 'text' },
  { key: 'sistem_comparte', label: 'Sistema que Comparte', type: 'text' },
  {
    key: 'plato_antivortice',
    label: 'Plato Antivórtice',
    type: 'select',
    options: YES_NO_OPTIONS,
  },
];

export const TELEV: TechnicalFieldConfig[] = [
  { key: 'capacidad', label: 'Capacidad', type: 'text' },
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'comparte_cisterna', label: 'Comparte Cisterna', type: 'text' },
  {
    key: 'detalle_compartir',
    label: 'Detalle Compartir',
    type: 'text',
    multiline: true,
  },
  {
    key: 'subcomponentes',
    label: 'Subcomponentes / Electrobombas',
    type: 'collection',
    fields: [
      {
        key: 'tipo',
        label: 'Tipo',
        type: 'select',
        options: [{ label: 'Electrobomba', value: 'electrobomba' }],
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
];

export const BDOS: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];

export const BELEC: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo Bomba', type: 'text' },
  { key: 'tipo_bomba', label: 'Tipo Bomba', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text' },
  { key: 'capacidad_bomba', label: 'Capacidad Bomba', type: 'text' },
  {
    key: 'capacidad_bomba_gpm',
    label: 'Capacidad Bomba GPM',
    type: 'number',
    suffix: 'GPM',
  },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
];

export const TFIL: TechnicalFieldConfig[] = [
  { key: 'indice', label: 'Índice', type: 'number' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'filtro_racor', label: 'Filtro Racor', type: 'boolean' },
  {
    key: 'ano_operacion_filtro',
    label: 'Año Filtro Racor',
    type: 'number',
    visibleWhen: { key: 'filtro_racor', equals: true },
  },
];

export const THID: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'capacidad_l', label: 'Capacidad', type: 'number', suffix: 'L' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];

export const VREG: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];

export const BDS: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'capacidad_motor', label: 'Capacidad Motor', type: 'text' },
  { key: 'capacidad_bomba', label: 'Capacidad Bomba', type: 'text' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
];
