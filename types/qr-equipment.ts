export interface QREquipmentRouteParams {
  buildingId: string;
  buildingName: string;
  equipamentoId: string;
  equipamentoNombre: string;
  frecuencia: string;
  equipoId: string;
  equipoCodigo: string;
  equipoUbicacion: string;
  equipoDetalleUbicacion?: string;
}

export interface QREquipmentAction {
  key: string;
  title: string;
  description: string;
  iconName: MaterialIconName;
  onPress: () => void;
}
