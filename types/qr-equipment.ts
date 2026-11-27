import type { ComponentProps } from 'react';
import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type QREquipmentRouteParams = {
  buildingId: string;
  buildingName: string;
  equipamentoId: string;
  equipamentoNombre: string;
  frecuencia: string;
  equipoId: string;
  equipoCodigo: string;
  equipoUbicacion: string;
  equipoDetalleUbicacion?: string;
};

export interface QREquipmentAction {
  key: string;
  title: string;
  description: string;
  iconName: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
}
