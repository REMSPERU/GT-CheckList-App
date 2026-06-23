import type { TechnicalFieldConfig } from './common';
import { YES_NO_OPTIONS } from './common';

export const RH: TechnicalFieldConfig[] = [
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
        options: [{ label: 'Grupo Red Húmeda', value: 'grupo_red_humeda' }],
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
          {
            key: 'manguera',
            label: 'Manguera',
            type: 'select',
            options: YES_NO_OPTIONS,
          },
          {
            key: 'valvula_angular',
            label: 'Válvula Angular',
            type: 'select',
            options: YES_NO_OPTIONS,
          },
        ],
      },
    ],
  },
];

export const SIN: TechnicalFieldConfig[] = [
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
      {
        key: 'con_parlantes',
        label: 'Con Parlantes',
        type: 'boolean',
        visibleWhen: { key: 'tipo', equals: 'luces_estroboscopicas' },
      },
    ],
  },
];

export const PCF: TechnicalFieldConfig[] = [
  { key: 'indice', label: 'Índice', type: 'number' },
  { key: 'ubicacion_detalle', label: 'Ubicación Detalle', type: 'text' },
  { key: 'puerta_marca', label: 'Marca Puerta', type: 'text' },
  { key: 'puerta_modelo', label: 'Modelo Puerta', type: 'text' },
  { key: 'cierre_tipo', label: 'Tipo Cierre', type: 'text' },
  { key: 'cierre_marca', label: 'Marca Cierre', type: 'text' },
  { key: 'cierre_modelo', label: 'Modelo Cierre', type: 'text' },
  {
    key: 'barra_antipanico',
    label: 'Barra Antipánico',
    type: 'select',
    options: YES_NO_OPTIONS,
  },
  { key: 'barra_marca', label: 'Marca Barra', type: 'text' },
  { key: 'barra_modelo', label: 'Modelo Barra', type: 'text' },
  { key: 'cantidad', label: 'Cantidad', type: 'number' },
];

export const BJOCK: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'motor_potencia', label: 'Potencia Motor', type: 'text' },
  { key: 'bomba_capacidad', label: 'Capacidad Bomba', type: 'text' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
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
];
