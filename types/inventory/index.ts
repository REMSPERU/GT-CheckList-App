import type { TechnicalFieldConfig } from './common';
import * as hvac from './hvac';
import * as electrical from './electrical';
import * as sanitary from './sanitary';
import * as fireSafety from './fire-safety';
import * as securityTelecom from './security-telecom';

export * from './common';

export const EQUIPMENT_TECHNICAL_FIELDS: Record<
  string,
  TechnicalFieldConfig[]
> = {
  // HVAC
  CHAI: hvac.CHAI,
  CHAG: hvac.CHAG,
  TOE: hvac.TOE,
  SPLIT: hvac.SPLIT,
  FCU: hvac.FCU,
  UMA: hvac.UMA,
  AUTOC: hvac.AUTOC,
  VFOR: hvac.VFOR,
  VRF: hvac.VRF,

  // Electrical
  TBELEC: electrical.TBELEC,
  LUZ: electrical.LUZ,
  PAT: electrical.PAT,
  GE: electrical.GE,
  SUBE: electrical.SUBE,
  TBDIST: electrical.TBDIST,
  TBAUTO: electrical.TBAUTO,
  BUSBAR: electrical.BUSBAR,
  TTA: electrical.TTA,
  TRAIS: electrical.TRAIS,

  // Sanitary & Pumps
  ABL: sanitary.ABL,
  BBA: sanitary.BBA,
  BACHC: sanitary.BACHC,
  BACHP: sanitary.BACHP,
  BACHS: sanitary.BACHS,
  BADC: sanitary.BADC,
  BADP: sanitary.BADP,
  CISTPTAG: sanitary.CISTPTAG,
  CISTBCI: sanitary.CISTBCI,
  TELEV: sanitary.TELEV,
  BDOS: sanitary.BDOS,
  BELEC: sanitary.BELEC,
  TFIL: sanitary.TFIL,
  THID: sanitary.THID,
  VREG: sanitary.VREG,
  BDS: sanitary.BDS,

  // Fire Safety
  RH: fireSafety.RH,
  SIN: fireSafety.SIN,
  PCF: fireSafety.PCF,
  BJOCK: fireSafety.BJOCK,
  BINC: fireSafety.BINC,

  // Security, Telecom & Transport
  CCTV: securityTelecom.CCTV,
  SEGP: securityTelecom.SEGP,
  SEGV: securityTelecom.SEGV,
  ASC: securityTelecom.ASC,
  MAMP: securityTelecom.MAMP,
  DC: securityTelecom.DC,
  PDISC: securityTelecom.PDISC,
  CTELEF: securityTelecom.CTELEF,
};

export const EQUIPMENT_TECHNICAL_FIELD_ALIASES: Record<string, string> = {
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
  ABLANDADOR: 'ABL',
  ABLANDADOR_AGUA: 'ABL',
  ABLANDADOR_DE_AGUA: 'ABL',
  AGUA: 'ABL',
  // Splits
  SP: 'SPLIT',
  // Ventilación
  VENT: 'VFOR',
  VF: 'VFOR',
  VENTILACION_FORZADA: 'VFOR',
  EXA: 'VFOR',
  EXM: 'VFOR',
  INA: 'VFOR',
  JF: 'VFOR',
  PRE: 'VFOR',
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
  CPTAG: 'CISTPTAG',
  CISAP: 'CISTPTAG',
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
  BA: 'BELEC',
  BBA: 'BELEC',
  BOMBA_DOSIFICADORA: 'BDOS',
  BDOP: 'BDOS',
  BDTQ: 'BDOS',
  BOMBA_ELECTRICA: 'BELEC',
  BOMBA_ELECTRICA_PTAG: 'BELEC',
  BDESG: 'BDS',
  BOMBA_DESAGUE_SUMIDERO: 'BDS',
  // Válvulas
  REGUL: 'VREG',
  REGULADORA: 'VREG',
  VALVULA_REGULADORA: 'VREG',
  VRPS: 'VREG',
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
 * Esquemas específicos para subcomponentes que ahora son equipos independientes
 */
export const SUBCOMPONENT_TECHNICAL_FIELDS: Record<
  string,
  TechnicalFieldConfig[]
> = {
  // Red Húmeda
  gabinete: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'piso', label: 'Piso', type: 'text' },
    { key: 'manguera', label: 'Manguera', type: 'text' },
    { key: 'valvula_angular', label: 'Válvula Angular', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  rociadores: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'piso', label: 'Piso', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  // Extintores
  pqs: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'agente', label: 'Agente', type: 'text' },
    { key: 'peso', label: 'Peso', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  co2: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'agente', label: 'Agente', type: 'text' },
    { key: 'peso', label: 'Peso', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  // Puertas
  cortafuego: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'tipo_puerta', label: 'Tipo de Puerta', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  // Alarmas / Sensores
  panel_central: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  sensor_humo: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  estacion_manual: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  luz_estrobo: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  sirena: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  detector_calor: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  fuentes_nac: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  // CCTV y Telecom
  camara: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  pantalla: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'tam_pulgadas', label: 'Pulgadas', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  switch: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'sub_tipo', label: 'Sub Tipo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  servidor: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  telefono: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  radio: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'anio_operacion', label: 'Año de Operación', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  // Bombas genéricas
  bomba: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  // HVAC (VRV/VRF)
  condensador: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'unidad', label: 'Unidad / N°', type: 'number' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
    { key: 'voltaje', label: 'Voltaje', type: 'text' },
    { key: 'anio_operacion', label: 'Año', type: 'number' },
  ],
  evaporador_interior: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'unidad', label: 'Unidad / N°', type: 'number' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
    { key: 'voltaje', label: 'Voltaje', type: 'text' },
    { key: 'anio_operacion', label: 'Año', type: 'number' },
  ],
  placa: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'unidad', label: 'Unidad / N°', type: 'number' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
    { key: 'voltaje', label: 'Voltaje', type: 'text' },
    { key: 'anio_operacion', label: 'Año', type: 'number' },
  ],
  torre: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'unidad', label: 'Unidad / N°', type: 'number' },
    { key: 'ubicacion', label: 'Ubicación Específica', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'capacidad', label: 'Capacidad', type: 'text' },
    { key: 'refrigerante', label: 'Refrigerante', type: 'text' },
    { key: 'voltaje', label: 'Voltaje', type: 'text' },
    { key: 'anio_operacion', label: 'Año', type: 'number' },
  ],
};

/**
 * Obtiene la configuración de campos técnicos para una abreviatura de equipamento o un tipo de subcomponente.
 * Si es un subcomponente extraído (tiene 'tipo'), retorna su esquema específico.
 * Si no hay configuración específica, retorna campos genéricos.
 */
export function getTechnicalFields(
  abreviatura: string | null | undefined,
  tipoSubcomponente?: string | null | undefined,
): TechnicalFieldConfig[] {
  // 1. Si tenemos un tipo de subcomponente (ej. "camara", "Gabinete"), intentamos mapearlo primero
  if (tipoSubcomponente) {
    const normalizedSub = tipoSubcomponente.trim().toLowerCase();

    // Si coincide con algo específico (gabinete, camara, pqs, etc.)
    if (SUBCOMPONENT_TECHNICAL_FIELDS[normalizedSub]) {
      return SUBCOMPONENT_TECHNICAL_FIELDS[normalizedSub];
    }

    // VRF / HVAC
    if (normalizedSub.includes('evaporador'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['evaporador_interior'];
    if (normalizedSub.includes('condensador'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['condensador'];
    if (normalizedSub.includes('torre'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['torre'];
    if (normalizedSub.includes('placa'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['placa'];

    // Si contiene la palabra bomba, tablero, sensor, etc.
    if (normalizedSub.includes('bomba'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['bomba'];
    if (normalizedSub.includes('tablero'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['bomba']; // Reutilizamos estado
    // Alarmas / Sensores
    if (normalizedSub.includes('panel'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['panel_central'];
    if (normalizedSub.includes('sensor'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['sensor_humo'];
    if (normalizedSub.includes('estacion'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['estacion_manual'];
    if (normalizedSub.includes('luz'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['luz_estrobo'];
    if (normalizedSub.includes('sirena'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['sirena'];
    if (normalizedSub.includes('detector'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['detector_calor'];
    if (normalizedSub.includes('fuente'))
      return SUBCOMPONENT_TECHNICAL_FIELDS['fuentes_nac'];

    // Si no coincide con ningún subcomponente conocido, intentamos buscar el esquema por la abreviatura del equipo principal
    if (abreviatura) {
      const normalizedMain = abreviatura
        .trim()
        .toUpperCase()
        .replace(/[\s/-]+/g, '_');
      const key =
        EQUIPMENT_TECHNICAL_FIELD_ALIASES[normalizedMain] ?? normalizedMain;
      if (EQUIPMENT_TECHNICAL_FIELDS[key]) {
        return EQUIPMENT_TECHNICAL_FIELDS[key];
      }
    }

    // Si no coincide con nada, devolvemos genéricos para subcomponentes que tengan marca/modelo
    return getGenericSubcomponentFields();
  }

  // 2. Si no es subcomponente, usamos la abreviatura del equipo principal
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

function getGenericSubcomponentFields(): TechnicalFieldConfig[] {
  return [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
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
