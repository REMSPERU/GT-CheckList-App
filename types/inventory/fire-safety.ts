import type { TechnicalFieldConfig } from './common';
import { YES_NO_OPTIONS } from './common';

export const RH: TechnicalFieldConfig[] = [
  { key: 'numero_unidad', label: 'Número de Unidad', type: 'number' },
  {
    key: 'presion',
    label: 'Presión Nominal (PSI)',
    type: 'number',
  },
  { key: 'caudal', label: 'Caudal (GPM)', type: 'number' },
  { key: 'ubicacion', label: 'Ubicación General', type: 'text' },
  { key: 'observaciones', label: 'Observaciones', type: 'text' },
];

export const SIN: TechnicalFieldConfig[] = [
  { key: 'tipo_sistema', label: 'Tipo Sistema', type: 'text' },
  { key: 'estado_sistema', label: 'Estado Sistema', type: 'text' },
  {
    key: 'ubicacion_central',
    label: 'Ubicación de Central',
    type: 'text',
  },
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'observaciones', label: 'Observaciones', type: 'text' },
  {
    key: 'subcomponentes',
    label: 'Subcomponentes / Dispositivos',
    type: 'collection',
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' },
      { key: 'modelo', label: 'Modelo', type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', type: 'text' },
      { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    ],
  },
];

export const PCF: TechnicalFieldConfig[] = [
  { key: 'indice', label: 'Índice', type: 'number' },
  { key: 'cantidad', label: 'Cantidad', type: 'number' },
  { key: 'ubicacion_detalle', label: 'Ubicación Detalle', type: 'text' },
  { key: 'marca_puerta', label: 'Marca Puerta', type: 'text' },
  { key: 'puerta_marca', label: 'Marca Puerta', type: 'text' },
  { key: 'modelo_puerta', label: 'Modelo Puerta', type: 'text' },
  { key: 'puerta_modelo', label: 'Modelo Puerta', type: 'text' },
  { key: 'tipo_cierre', label: 'Tipo Cierre', type: 'text' },
  { key: 'cierre_tipo', label: 'Tipo Cierre', type: 'text' },
  { key: 'marca_cierre', label: 'Marca Cierre', type: 'text' },
  { key: 'cierre_marca', label: 'Marca Cierre', type: 'text' },
  { key: 'modelo_cierre', label: 'Modelo Cierre', type: 'text' },
  { key: 'cierre_modelo', label: 'Modelo Cierre', type: 'text' },
  { key: 'tiene_barra_antipanico', label: 'Tiene Barra Antipánico', type: 'text' },
  {
    key: 'barra_antipanico',
    label: 'Barra Antipánico',
    type: 'select',
    options: YES_NO_OPTIONS,
  },
  { key: 'marca_barra', label: 'Marca Barra', type: 'text' },
  { key: 'barra_marca', label: 'Marca Barra', type: 'text' },
  { key: 'modelo_barra', label: 'Modelo Barra', type: 'text' },
  { key: 'barra_modelo', label: 'Modelo Barra', type: 'text' },
  {
    key: 'subcomponentes',
    label: 'Subcomponentes',
    type: 'collection',
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' },
      { key: 'modelo', label: 'Modelo', type: 'text' },
    ],
  },
];

export const BJOCK: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'motor_potencia', label: 'Potencia Motor', type: 'text' },
  { key: 'bomba_capacidad', label: 'Capacidad Bomba', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
  { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
  {
    key: 'marca_tablero',
    label: 'Marca Tablero',
    type: 'text',
    section: 'Tablero de Control',
  },
  {
    key: 'modelo_tablero',
    label: 'Modelo Tablero',
    type: 'text',
    section: 'Tablero de Control',
  },
  {
    key: 'ano_tablero',
    label: 'Año Tablero',
    type: 'number',
    section: 'Tablero de Control',
  },
  {
    key: 'subcomponentes',
    label: 'Subcomponentes / Tablero Control',
    type: 'collection',
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' },
      { key: 'modelo', label: 'Modelo', type: 'text' },
      { key: 'ano_operacion', label: 'Año', type: 'number' },
    ],
  },
];

export const BINC: TechnicalFieldConfig[] = [
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'motor_marca', label: 'Marca Motor', type: 'text', section: 'Motor' },
  {
    key: 'motor_modelo',
    label: 'Modelo Motor',
    type: 'text',
    section: 'Motor',
  },
  {
    key: 'motor_potencia',
    label: 'Potencia Motor',
    type: 'text',
    section: 'Motor',
  },
  { key: 'motor_ano', label: 'Año Motor', type: 'number', section: 'Motor' },
  {
    key: 'bomba_capacidad',
    label: 'Capacidad Bomba',
    type: 'text',
    section: 'Bomba',
  },
  { key: 'bomba_ano', label: 'Año Bomba', type: 'number', section: 'Bomba' },
  {
    key: 'tablero_marca',
    label: 'Marca Tablero',
    type: 'text',
    section: 'Tablero',
  },
  {
    key: 'tablero_modelo',
    label: 'Modelo Tablero',
    type: 'text',
    section: 'Tablero',
  },
  { key: 'vacuometro', label: 'Vacuómetro', type: 'text' },
  { key: 'tanque_combustible', label: 'Tanque Combustible', type: 'text' },
  {
    key: 'subcomponentes',
    label: 'Subcomponentes',
    type: 'collection',
    fields: [
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' },
      { key: 'modelo', label: 'Modelo', type: 'text' },
      { key: 'capacidad', label: 'Capacidad', type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', type: 'text' },
    ],
  },
];
