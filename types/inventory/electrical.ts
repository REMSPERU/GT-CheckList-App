import type { TechnicalFieldConfig } from './common';

export const TBELEC: TechnicalFieldConfig[] = [
  { key: 'rotulo', label: 'Rótulo', type: 'text' },
  { key: 'tipo_tablero', label: 'Tipo Tablero', type: 'text' },
  { key: 'detalle_tecnico.tipo_tablero', label: 'Montaje Tablero', type: 'text', section: 'Detalle Técnico' },
  { key: 'detalle_tecnico.fases', label: 'Fases', type: 'text', section: 'Detalle Técnico' },
  { key: 'detalle_tecnico.voltaje', label: 'Voltaje', type: 'number', suffix: 'V', section: 'Detalle Técnico' },
  { key: 'fases', label: 'Fases', type: 'text' },
  { key: 'voltaje', label: 'Voltaje', type: 'number', suffix: 'V' },
];

export const LUZ: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  {
    key: 'capacidad_bateria',
    label: 'Capacidad Batería',
    type: 'number',
    suffix: 'Ah',
  },
  { key: 'ano_instalacion', label: 'Año Instalación', type: 'number' },
];

export const PAT: TechnicalFieldConfig[] = [
  { key: 'grupo', label: 'Grupo / Malla', type: 'text' },
  { key: 'numero', label: 'Número', type: 'text' },
  { key: 'DENOMINACION', label: 'Denominación', type: 'text' },
];

export const GE: TechnicalFieldConfig[] = [
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
];

export const SUBE: TechnicalFieldConfig[] = [
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
];

export const TBDIST: TechnicalFieldConfig[] = [
  { key: 'numero_tablero', label: 'Número de Tablero', type: 'number' },
  { key: 'rotulo', label: 'Rótulo', type: 'text' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text' },
];

export const TBAUTO: TechnicalFieldConfig[] = [
  { key: 'numero_tablero', label: 'Número de Tablero', type: 'number' },
  { key: 'rotulo', label: 'Rótulo', type: 'text' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text' },
];

export const BUSBAR: TechnicalFieldConfig[] = [
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
];

export const TTA: TechnicalFieldConfig[] = [
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  { key: 'tipo_transferencia', label: 'Tipo Transferencia', type: 'text' },
  { key: 'marca_modulo', label: 'Marca Módulo', type: 'text' },
  { key: 'modelo_modulo', label: 'Modelo Módulo', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  {
    key: 'observaciones',
    label: 'Observaciones',
    type: 'text',
    multiline: true,
  },
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
];

export const TRAIS: TechnicalFieldConfig[] = [
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
];
