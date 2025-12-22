import { useQuery } from '@tanstack/react-query';
import { electricalPanelApi } from '../services/electrical_panel.api';
import type { TableroElectricoResponse } from '../types/api';

export const useElectricalPanelsByPropertyQuery = (propertyId: string, panelType?: string, search?: string) => {
  return useQuery<TableroElectricoResponse[], Error>({
    queryKey: ['electricalPanels', 'byProperty', propertyId, panelType, search],
    queryFn: () => electricalPanelApi.getByProperty(propertyId, panelType, search),
    enabled: !!propertyId, // Only run the query if propertyId is provided
  });
};
