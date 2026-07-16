import type { TechnicalFieldConfig } from './common';
import { ACCESS_DEVICE_FIELDS } from './common';

export const CCTV: TechnicalFieldConfig[] = [
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
      {
        key: 'tam_pulgadas',
        label: 'Tamaño (pulgadas)',
        type: 'number',
        visibleWhen: { key: 'tipo', equals: 'pantalla' },
      },
      {
        key: 'capacidad',
        label: 'Capacidad',
        type: 'text',
        visibleWhen: { key: 'tipo', equals: 'almacenamiento' },
      },
    ],
  },
];

export const SEGP: TechnicalFieldConfig[] = [
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
          {
            label: 'Molinete Discapacitados',
            value: 'molinete_discapacitados',
          },
          { label: 'Lectoras de Acceso', value: 'lectoras_acceso' },
          { label: 'Pulsadores de Acceso', value: 'pulsadores_acceso' },
          {
            label: 'Cerraduras Electromagnéticas',
            value: 'cerraduras_electromagneticas',
          },
          { label: 'Sensores de Movimiento', value: 'sensores_movimiento' },
          {
            key: 'contactos_magneticos',
            label: 'Contactos Magnéticos',
            type: 'collection',
            fields: ACCESS_DEVICE_FIELDS,
          },
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
];

export const SEGV: TechnicalFieldConfig[] = [
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
          {
            label: 'Dispositivos Tecnología',
            value: 'dispositivos_tecnologia',
          },
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
];

export const ASC: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'capacidad', label: 'Capacidad', type: 'text' },
  { key: 'tipo_llamada', label: 'Tipo Llamada', type: 'text' },
  { key: 'detalle_llamada', label: 'Detalle Llamada', type: 'text' },
  { key: 'llamada_anticipada', label: 'Llamada Anticipada', type: 'boolean' },
  { key: 'ano_operacion', label: 'Año de Operación', type: 'number' },
];

export const MAMP: TechnicalFieldConfig[] = [
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo_freno', label: 'Modelo Freno', type: 'text' },
  { key: 'tipo_vidrio', label: 'Tipo Vidrio', type: 'text' },
  { key: 'tipo_vidrio_otros', label: 'Otro Tipo Vidrio', type: 'text' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text' },
];

export const DC: TechnicalFieldConfig[] = [
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
];

export const PDISC: TechnicalFieldConfig[] = [
  { key: 'unidad', label: 'Unidad', type: 'number' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'capacidad', label: 'Capacidad', type: 'number', suffix: 'Kg' },
  { key: 'tiempo_operacion', label: 'Tiempo Operación', type: 'text' },
  { key: 'cantidad', label: 'Cantidad', type: 'number' },
];

export const CTELEF: TechnicalFieldConfig[] = [
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
];
