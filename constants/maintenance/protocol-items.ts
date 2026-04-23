export const ELECTRICAL_PANEL_PROTOCOL_ITEMS = [
  {
    key: 'tablero_sin_oxido',
    label: '1. Tablero sin óxido y pintura buen estado',
  },
  { key: 'puerta_mandil_aterrados', label: '2. Puerta y mandil aterrados' },
  { key: 'cables_libres_halogenos', label: '3. Cables libres de halógenos' },
  {
    key: 'identificacion_fases',
    label: '4. Identificación de fases (L1 - L2 - L3 - N)',
  },
  {
    key: 'interruptores_terminales',
    label: '5. Interruptores con terminales (No cable directo)',
  },
  { key: 'linea_tierra_correcta', label: '6. Línea de tierra correcta' },
  {
    key: 'diagrama_unifilar_actualizado',
    label: '7. Diagrama unifilar actualizado',
  },
  { key: 'luz_emergencia', label: '8. Luz de emergencia operativa' },
  { key: 'rotulado_circuitos', label: '9. Rotulado de circuitos' },
  {
    key: 'interruptores_riel_din',
    label: '10. Interruptores fijados en riel din',
  },
] as const;

export type ElectricalPanelProtocolKey =
  (typeof ELECTRICAL_PANEL_PROTOCOL_ITEMS)[number]['key'];

export type ElectricalPanelProtocolState = Record<
  ElectricalPanelProtocolKey,
  boolean
>;

export const DEFAULT_ELECTRICAL_PANEL_PROTOCOL_STATE =
  ELECTRICAL_PANEL_PROTOCOL_ITEMS.reduce<ElectricalPanelProtocolState>(
    (acc, item) => {
      acc[item.key] = true;
      return acc;
    },
    {} as ElectricalPanelProtocolState,
  );
